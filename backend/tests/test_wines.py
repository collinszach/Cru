import uuid

from tests.factories import make_appellation, make_user, make_vintage_quality, make_wine


async def test_create_wine_returns_201(client, db):
    await make_user(db)
    response = await client.post(
        "/api/v1/wines",
        json={
            "name": "Clos de Vougeot",
            "full_name": "DRC Clos de Vougeot",
            "style": "Still",
            "color": "red",
            "slug": "drc-clos-de-vougeot-test",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["slug"] == "drc-clos-de-vougeot-test"
    assert data["style"] == "Still"


async def test_create_wine_duplicate_slug_returns_409(client, db):
    await make_user(db)
    await make_wine(db, slug="duplicate-slug-test")
    response = await client.post(
        "/api/v1/wines",
        json={
            "name": "Another Wine",
            "full_name": "Another Full Name",
            "style": "Still",
            "color": "white",
            "slug": "duplicate-slug-test",
        },
    )
    assert response.status_code == 409


async def test_get_wine_by_id(client, db):
    await make_user(db)
    wine = await make_wine(db, full_name="Specific Wine", slug="specific-wine-test")
    response = await client.get(f"/api/v1/wines/{wine.id}")
    assert response.status_code == 200
    assert response.json()["full_name"] == "Specific Wine"


async def test_get_wine_404_for_unknown_id(client, db):
    await make_user(db)
    response = await client.get(f"/api/v1/wines/{uuid.uuid4()}")
    assert response.status_code == 404


async def test_wine_search_by_name(client, db):
    await make_user(db)
    await make_wine(db, full_name="Opus One 2019", slug="opus-one-2019-test")
    await make_wine(db, full_name="Screaming Eagle 2020", slug="screaming-eagle-test")
    response = await client.get("/api/v1/wines?q=Opus")
    assert response.status_code == 200
    results = response.json()["items"]
    names = [w["full_name"] for w in results]
    assert "Opus One 2019" in names
    assert "Screaming Eagle 2020" not in names


async def test_wine_search_by_style(client, db):
    await make_user(db)
    await make_wine(db, full_name="Red Wine", style="Still", color="red", slug="red-test")
    await make_wine(db, full_name="Bubbly", style="Sparkling", color="white", slug="sparkling-test")
    response = await client.get("/api/v1/wines?style=Still")
    assert response.status_code == 200
    results = response.json()["items"]
    styles = [w["style"] for w in results]
    assert all(s == "Still" for s in styles)


async def test_wine_autocomplete_returns_minimal_shape(client, db):
    await make_user(db)
    await make_wine(db, full_name="Pichon Baron 2015", slug="pichon-baron-test")
    response = await client.get("/api/v1/wines/autocomplete?q=Pichon")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert "id" in data[0]
    assert "full_name" in data[0]
    # Autocomplete returns minimal shape — no heavy fields
    assert "description" not in data[0]
    assert "primary_grapes" not in data[0]


async def test_wine_search_endpoint(client, db):
    """GET /api/v1/wines/search supports appellation_slug filter."""
    await make_user(db)
    appellation = await make_appellation(db, slug="napa-valley-test")
    await make_wine(db, full_name="Napa Cab", slug="napa-cab-test", appellation_id=appellation.id)
    await make_wine(db, full_name="Burgundy Pinot", slug="burgundy-pinot-test")
    response = await client.get("/api/v1/wines/search?appellation_slug=napa-valley-test")
    assert response.status_code == 200
    results = response.json()
    names = [w["full_name"] for w in results]
    assert "Napa Cab" in names
    assert "Burgundy Pinot" not in names


# ---------------------------------------------------------------------------
# /vintages endpoint
# ---------------------------------------------------------------------------


async def test_vintages_returns_empty_when_no_appellation(client, db):
    """Wine with no appellation_id returns 200 with an empty list."""
    await make_user(db)
    wine = await make_wine(db, slug="no-appellation-wine-test")
    response = await client.get(f"/api/v1/wines/{wine.id}/vintages")
    assert response.status_code == 200
    assert response.json() == []


async def test_vintages_returns_chart_for_appellation(client, db):
    """Wine linked to an appellation returns vintage_quality rows for that appellation."""
    await make_user(db)
    appellation = await make_appellation(db, slug="barolo-test")
    wine = await make_wine(db, slug="barolo-riserva-test", appellation_id=appellation.id)
    await make_vintage_quality(
        db,
        region_slug="barolo-test",
        vintage=2016,
        score=98,
        descriptor="exceptional",
        appellation_id=appellation.id,
    )
    response = await client.get(f"/api/v1/wines/{wine.id}/vintages")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["vintage"] == 2016
    assert data[0]["score"] == 98
    assert data[0]["descriptor"] == "exceptional"
    assert data[0]["user_notes"] == 0


async def test_vintages_404_for_unknown_wine(client, db):
    """Unknown wine ID returns 404."""
    await make_user(db)
    response = await client.get(f"/api/v1/wines/{uuid.uuid4()}/vintages")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# /scanner/confirm endpoint
# ---------------------------------------------------------------------------


async def test_scanner_confirm_creates_wine_from_scan(client, db):
    """Confirm with extracted fields creates a new wine and returns it."""
    await make_user(db)
    response = await client.post(
        "/api/v1/scanner/confirm",
        json={"wine_name": "Clos de Vougeot Test", "producer": "DRC", "style": "red"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Clos de Vougeot Test"
    assert data["slug"] == "drc-clos-de-vougeot-test"


async def test_scanner_confirm_links_to_existing_wine(client, db):
    """Confirm with wine_id returns the existing wine without creating a duplicate."""
    await make_user(db)
    wine = await make_wine(db, slug="existing-wine-confirm-test")
    response = await client.post(
        "/api/v1/scanner/confirm",
        json={"wine_id": str(wine.id)},
    )
    assert response.status_code == 200
    assert response.json()["id"] == str(wine.id)


async def test_scanner_confirm_deduplicates_by_slug(client, db):
    """Posting the same producer/wine_name twice returns the same wine — no duplicate created."""
    await make_user(db)
    payload = {"wine_name": "Chambolle Musigny Dedup", "producer": "Mugnier", "style": "red"}
    first = await client.post("/api/v1/scanner/confirm", json=payload)
    second = await client.post("/api/v1/scanner/confirm", json=payload)
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]


async def test_scanner_confirm_requires_wine_name_or_wine_id(client, db):
    """Empty payload with neither wine_id nor wine_name returns 422."""
    await make_user(db)
    response = await client.post("/api/v1/scanner/confirm", json={})
    assert response.status_code == 422
