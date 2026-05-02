from tests.factories import make_appellation, make_user


async def test_list_appellations_returns_list(client, db):
    await make_user(db)
    await make_appellation(db, name="Pomerol", slug="pomerol-test", country="France")
    response = await client.get("/api/v1/regions")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    slugs = [a["slug"] for a in response.json()]
    assert "pomerol-test" in slugs


async def test_get_region_by_slug(client, db):
    await make_user(db)
    await make_appellation(db, name="Barolo", slug="barolo-test", country="Italy")
    response = await client.get("/api/v1/regions/barolo-test")
    assert response.status_code == 200
    assert response.json()["name"] == "Barolo"


async def test_get_region_unknown_slug_returns_404(client, db):
    await make_user(db)
    response = await client.get("/api/v1/regions/nonexistent-slug-xyz")
    assert response.status_code == 404
