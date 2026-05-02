"""
Seed demo cellar entries, tasting notes, and wishlist items for the primary user.
Run once to populate the app with realistic sample data.
"""
import asyncio
import uuid
from datetime import datetime, timezone, timedelta, date
from app.database import AsyncSessionLocal
from sqlalchemy import text


USER_ID = "user_3CGhdhoj67o20DtuPHBgvQcEzUy"

# Wine IDs from seed
WINES = {
    "latour":       "0bf9a279-35b8-47bd-9325-0dbce57b2352",
    "margaux":      "034df738-5167-40c6-8451-f01abff93273",
    "petrus":       "9bb9aacf-b248-46e6-9827-d3fb4050ae77",
    "pichon":       "bc5bfd00-fa74-45e5-96f2-4bff7f6e8b20",
    "rousseau_ch":  "aa658c3b-75b1-4f89-b26e-24e34af00107",    # Chambertin GC
    "rousseau_csj": "4bc2b377-edde-4c85-9988-ef6719246c60",   # CSJ
    "drc_tache":    "c17db8b3-55fe-4ae8-978b-c1c41cac62dc",
    "drc_rc":       "2d2b20a5-30a1-4192-835a-f0622f303000",
    "krug_gc":      "92fb1b43-b9fd-4951-ba89-da0efa419b2a",
    "krug_cm":      "60e4a43c-76ed-4cf7-891e-2c74c22b2b6d",
    "bollinger":    "a4f3c005-b9df-4793-8d24-7e205ef69193",
    "ridge":        "4c4111c2-3edd-4ef7-be48-7e2336dcfbc3",
    "harlan":       "7703257a-ff47-4a19-bfca-ec362de0de38",
    "barolo_bm":    "01032bb4-5596-4f87-8fb6-55d9b6ff2e3a",   # Bartolo Mascarello
    "conterno_mf":  "0c408bfc-e1dd-4227-9f03-521bba127b6a",   # Monfortino
    "conterno_cf":  "32efd4d5-f7c8-48d7-b48f-2c779767d5ab",   # Cascina Francia
    "jj_auslese":   "a46cf22a-5c99-4ea3-ad9c-d21facbe71fa",
    "jj_spatlese":  "d98c7d43-f8b1-493b-bc93-2ff143a11f2d",
    "salon":        "4530f6c6-adbf-4aca-b032-43e657098522",
    "leroy":        "d67250ea-ac36-40eb-9f78-69f817ae1192",
}


def uid():
    return str(uuid.uuid4())


def ts(days_ago=0):
    return datetime.now(timezone.utc) - timedelta(days=days_ago)


async def seed():
    async with AsyncSessionLocal() as db:
        # ── Check already seeded ──────────────────────────────────────────────
        r = await db.execute(text("SELECT COUNT(*) FROM cellar_entries WHERE user_id = :u"), {"u": USER_ID})
        if r.scalar() > 0:
            print("Demo data already seeded. Delete cellar_entries / tasting_notes rows to re-run.")
            return

        print("Seeding cellar entries...")

        # ── CELLAR ENTRIES ────────────────────────────────────────────────────
        cellar_rows = [
            # id, wine_id, vintage, qty, format, purchase_date, purchase_price, source, bin, drink_from, drink_by, status, is_featured, featured_story, featured_occasion, current_value
            (uid(), WINES["rousseau_ch"],  2015, 3, "750ml", date(2017,11,15), 1850.00, "allocation",  "A-1", 2022, 2045, "in_cellar", True,
             "Found through a small Burgundy négociant on a trip to Beaune. Three bottles, not to be opened before 2027. The 2015 vintage is one of the finest Rousseau has made — ripe, structured, and built to run the distance.",
             "discovery", None),
            (uid(), WINES["rousseau_csj"], 2019, 6, "750ml", date(2021, 6, 1), 420.00,  "allocation",  "A-2", 2026, 2038, "in_cellar", False, None, None, None),
            (uid(), WINES["pichon"],       2016, 12,"750ml", date(2018, 4,20), 185.00,  "retailer",    "B-1", 2024, 2040, "in_cellar", False, None, None, 280.00),
            (uid(), WINES["margaux"],      2009, 2, "750ml", date(2011, 9,10), 875.00,  "auction",     "A-3", 2018, 2045, "in_cellar", True,
             "Bought blind at a Sotheby's auction on the strength of Parker's 100-point review. It sat for two years before I worked up the nerve to look up what I'd paid. No regrets.",
             "milestone", None),
            (uid(), WINES["krug_gc"],      2021, 6, "750ml", date(2024, 1,15), 210.00,  "retailer",    "C-1", 2024, 2030, "in_cellar", False, None, None, None),
            (uid(), WINES["ridge"],        2013, 3, "750ml", date(2016, 8,10), 155.00,  "winery",      "B-2", 2023, 2035, "in_cellar", False, None, None, 195.00),
            (uid(), WINES["conterno_mf"],  2010, 2, "1.5L",  date(2015, 3,22), 480.00,  "retailer",    "A-4", 2025, 2050, "in_cellar", True,
             "Magnum. Monfortino 2010 in magnum format — this is how you mark a decade. Cellared for my 50th birthday, which is still some years away. Do not touch.",
             "milestone", None),
            (uid(), WINES["harlan"],       2017, 1, "750ml", date(2020,11, 1), 995.00,  "allocation",  "A-5", 2025, 2045, "in_cellar", False, None, None, 1150.00),
            (uid(), WINES["jj_auslese"],   2021, 4, "375ml", date(2023, 7,10), 95.00,   "retailer",    "D-1", 2025, 2050, "in_cellar", False, None, None, None),
            (uid(), WINES["bollinger"],    2012, 3, "750ml", date(2021, 5, 5), 280.00,  "retailer",    "C-2", 2022, 2035, "in_cellar", False, None, None, 310.00),
            (uid(), WINES["conterno_cf"],  2016, 3, "750ml", date(2019, 2,14), 210.00,  "allocation",  "A-6", 2024, 2040, "in_cellar", False, None, None, None),
            # Consumed bottles (for tasting notes)
            (uid(), WINES["drc_tache"],    2010, 1, "750ml", date(2015, 6, 1), 2200.00, "auction",     None,  2018, 2040, "consumed",  True,
             "A farewell dinner for my closest friends before a two-year overseas posting. Eight of us, two courses of lamb, and this. No one spoke for the first five minutes after the first pour.",
             "milestone", None),
            (uid(), WINES["latour"],       2005, 1, "750ml", date(2012, 4, 1), 560.00,  "retailer",    None,  2020, 2045, "consumed",  False, None, None, None),
            (uid(), WINES["barolo_bm"],    2015, 1, "750ml", date(2018,10,10), 125.00,  "winery",      None,  2023, 2040, "consumed",  False, None, None, None),
            (uid(), WINES["salon"],        2008, 1, "750ml", date(2019,12,31), 650.00,  "retailer",    None,  2020, 2040, "consumed",  True,
             "New Year's Eve 2023. Just the two of us, oysters from the market, and this. Worth every penny and then some.",
             "anniversary", None),
            (uid(), WINES["krug_cm"],      2004, 1, "750ml", date(2020, 1,10), 890.00,  "allocation",  None,  2018, 2040, "consumed",  False, None, None, None),
        ]

        cellar_ids = {}
        for row in cellar_rows:
            (cid, wine_id, vintage, qty, fmt, pdate, price, source, bin_loc,
             dfrom, dto, status, is_feat, story, occasion, cval) = row

            cellar_ids[wine_id] = cid
            consumed_at = ts(90) if status == "consumed" else None

            await db.execute(text("""
                INSERT INTO cellar_entries
                  (id, user_id, wine_id, vintage, quantity, format, purchase_date, purchase_price,
                   currency, purchase_source, bin_location, drink_from, drink_by,
                   is_featured, featured_story, featured_occasion,
                   current_value, status, consumed_at, created_at, updated_at)
                VALUES
                  (:id, :uid, :wid, :vintage, :qty, :fmt, :pdate, :price,
                   'USD', :src, :bin, :dfrom, :dto,
                   :isfeat, :story, :occ,
                   :cval, :status, :cat, now(), now())
            """), {
                "id": cid, "uid": USER_ID, "wid": wine_id, "vintage": vintage,
                "qty": qty, "fmt": fmt, "pdate": pdate, "price": price,
                "src": source, "bin": bin_loc, "dfrom": dfrom, "dto": dto,
                "isfeat": is_feat, "story": story, "occ": occasion,
                "cval": cval, "status": status, "cat": consumed_at,
            })

        print(f"Inserted {len(cellar_rows)} cellar entries.")

        # ── TASTING NOTES ─────────────────────────────────────────────────────
        print("Seeding tasting notes...")

        notes = [
            {
                "wine_id": WINES["drc_tache"],
                "cellar_entry_id": cellar_ids.get(WINES["drc_tache"]),
                "vintage": 2010,
                "tasted_at": ts(90),
                "occasion": "dinner",
                "location": "Home, San Francisco",
                "decant_minutes": 120,
                "companions": ["Sarah", "James", "Eliot", "Nora", "Paul", "Marie", "Thomas"],
                "app_clarity": "clear", "app_intensity": "medium", "app_color": "ruby",
                "nose_intensity": "pronounced", "nose_development": "mature",
                "nose_descriptors": [
                    {"tier": "primary", "descriptor": "red cherry", "intensity": "medium"},
                    {"tier": "primary", "descriptor": "raspberry", "intensity": "medium-"},
                    {"tier": "secondary", "descriptor": "forest floor", "intensity": "medium"},
                    {"tier": "secondary", "descriptor": "sous-bois", "intensity": "medium+"},
                    {"tier": "tertiary", "descriptor": "dried rose", "intensity": "medium"},
                    {"tier": "tertiary", "descriptor": "game", "intensity": "medium-"},
                    {"tier": "tertiary", "descriptor": "truffle", "intensity": "medium"},
                    {"tier": "tertiary", "descriptor": "spice", "intensity": "medium"},
                ],
                "palate_sweetness": "dry", "palate_acidity": "high", "palate_tannin": "medium",
                "palate_tannin_nature": "silky", "palate_alcohol": "medium", "palate_body": "medium",
                "palate_finish": "very_long", "palate_finish_sec": 65, "palate_intensity": "pronounced",
                "palate_descriptors": [
                    {"tier": "primary", "descriptor": "red cherry", "intensity": "medium"},
                    {"tier": "secondary", "descriptor": "earth", "intensity": "medium"},
                    {"tier": "tertiary", "descriptor": "truffle", "intensity": "medium+"},
                    {"tier": "tertiary", "descriptor": "leather", "intensity": "medium-"},
                ],
                "quality": "outstanding", "readiness": "drink_now",
                "personal_score": 98.0,
                "free_note": "Transcendent. The tannins have fully dissolved into the wine; what remains is pure silken texture and a kaleidoscope of tertiary complexity. The finish lasted longer than any wine I have ever tasted. We poured the last glass an hour after opening — it had only improved. I don't expect to drink La Tâche again. This was it.",
                "pairing_notes": "Rack of lamb, roasted garlic, thyme jus",
            },
            {
                "wine_id": WINES["latour"],
                "cellar_entry_id": cellar_ids.get(WINES["latour"]),
                "vintage": 2005,
                "tasted_at": ts(300),
                "occasion": "dinner",
                "location": "Home",
                "decant_minutes": 180,
                "companions": ["Sarah"],
                "app_clarity": "clear", "app_intensity": "deep", "app_color": "garnet",
                "nose_intensity": "medium+", "nose_development": "developing",
                "nose_descriptors": [
                    {"tier": "primary", "descriptor": "blackcurrant", "intensity": "medium+"},
                    {"tier": "primary", "descriptor": "plum", "intensity": "medium"},
                    {"tier": "secondary", "descriptor": "cedar", "intensity": "medium"},
                    {"tier": "secondary", "descriptor": "cigar box", "intensity": "medium"},
                    {"tier": "tertiary", "descriptor": "graphite", "intensity": "medium+"},
                    {"tier": "tertiary", "descriptor": "tobacco leaf", "intensity": "medium"},
                ],
                "palate_sweetness": "dry", "palate_acidity": "medium+", "palate_tannin": "medium+",
                "palate_tannin_nature": "firm", "palate_alcohol": "medium", "palate_body": "full",
                "palate_finish": "very_long", "palate_finish_sec": 55, "palate_intensity": "pronounced",
                "palate_descriptors": [
                    {"tier": "primary", "descriptor": "blackcurrant", "intensity": "pronounced"},
                    {"tier": "primary", "descriptor": "blackberry", "intensity": "medium"},
                    {"tier": "secondary", "descriptor": "cedar", "intensity": "medium"},
                    {"tier": "tertiary", "descriptor": "graphite", "intensity": "medium"},
                ],
                "quality": "outstanding", "readiness": "can_wait",
                "personal_score": 96.0,
                "free_note": "Still young despite nearly 20 years. After three hours of air the tannins softened considerably but the wine retains a grip that speaks to 10+ more years of evolution. A monumental Pauillac.",
                "pairing_notes": "Côte de boeuf with béarnaise",
            },
            {
                "wine_id": WINES["barolo_bm"],
                "cellar_entry_id": cellar_ids.get(WINES["barolo_bm"]),
                "vintage": 2015,
                "tasted_at": ts(60),
                "occasion": "dinner",
                "location": "Osteria, NYC",
                "decant_minutes": 60,
                "companions": ["Marcus"],
                "app_clarity": "clear", "app_intensity": "medium", "app_color": "garnet",
                "nose_intensity": "pronounced", "nose_development": "youthful",
                "nose_descriptors": [
                    {"tier": "primary", "descriptor": "cherry", "intensity": "medium+"},
                    {"tier": "primary", "descriptor": "raspberry", "intensity": "medium"},
                    {"tier": "secondary", "descriptor": "tar", "intensity": "medium"},
                    {"tier": "secondary", "descriptor": "dried rose", "intensity": "medium+"},
                    {"tier": "tertiary", "descriptor": "leather", "intensity": "medium-"},
                    {"tier": "tertiary", "descriptor": "tobacco", "intensity": "medium-"},
                ],
                "palate_sweetness": "dry", "palate_acidity": "high", "palate_tannin": "high",
                "palate_tannin_nature": "grippy", "palate_alcohol": "medium", "palate_body": "full",
                "palate_finish": "long", "palate_finish_sec": 42, "palate_intensity": "pronounced",
                "palate_descriptors": [
                    {"tier": "primary", "descriptor": "cherry", "intensity": "medium+"},
                    {"tier": "primary", "descriptor": "dried fruit", "intensity": "medium"},
                    {"tier": "secondary", "descriptor": "tar", "intensity": "medium"},
                ],
                "quality": "very_good", "readiness": "not_ready",
                "personal_score": 93.0,
                "free_note": "Traditional Mascarello — tar and roses in full effect. Big tannins need more time; I opened this five years too early. Still, the complexity is already evident. Would like to revisit in 2028.",
                "pairing_notes": "Braised wild boar with polenta",
            },
            {
                "wine_id": WINES["salon"],
                "cellar_entry_id": cellar_ids.get(WINES["salon"]),
                "vintage": 2008,
                "tasted_at": ts(120),
                "occasion": "dinner",
                "location": "Home, New Year's Eve",
                "decant_minutes": 0,
                "companions": ["Sarah"],
                "app_clarity": "clear", "app_intensity": "pale", "app_color": "lemon-gold",
                "nose_intensity": "pronounced", "nose_development": "developing",
                "nose_descriptors": [
                    {"tier": "primary", "descriptor": "green apple", "intensity": "medium"},
                    {"tier": "primary", "descriptor": "lemon curd", "intensity": "medium+"},
                    {"tier": "secondary", "descriptor": "brioche", "intensity": "medium+"},
                    {"tier": "secondary", "descriptor": "chalk", "intensity": "medium"},
                    {"tier": "tertiary", "descriptor": "honey", "intensity": "medium-"},
                    {"tier": "tertiary", "descriptor": "ginger", "intensity": "medium-"},
                ],
                "palate_sweetness": "bone_dry", "palate_acidity": "high", "palate_tannin": None,
                "palate_tannin_nature": None, "palate_alcohol": "medium", "palate_body": "medium+",
                "palate_mousse": "creamy",
                "palate_finish": "very_long", "palate_finish_sec": 58, "palate_intensity": "pronounced",
                "palate_descriptors": [
                    {"tier": "primary", "descriptor": "lemon", "intensity": "medium+"},
                    {"tier": "primary", "descriptor": "green apple", "intensity": "medium"},
                    {"tier": "secondary", "descriptor": "brioche", "intensity": "medium"},
                    {"tier": "tertiary", "descriptor": "mineral", "intensity": "pronounced"},
                ],
                "quality": "outstanding", "readiness": "drink_now",
                "personal_score": 99.0,
                "free_note": "The finest sparkling wine I have ever tasted. The chalk minerality is unlike anything in Champagne — a precise, electric quality that makes every other wine feel slightly blurry by comparison. Drank with a dozen oysters from Tomales Bay. Neither food nor wine was diminished; both were elevated.",
                "pairing_notes": "Tomales Bay oysters, mignonette",
            },
            {
                "wine_id": WINES["krug_cm"],
                "cellar_entry_id": cellar_ids.get(WINES["krug_cm"]),
                "vintage": 2004,
                "tasted_at": ts(450),
                "occasion": "dinner",
                "location": "Restaurant, London",
                "decant_minutes": 0,
                "companions": [],
                "app_clarity": "clear", "app_intensity": "medium", "app_color": "golden",
                "nose_intensity": "pronounced", "nose_development": "mature",
                "nose_descriptors": [
                    {"tier": "primary", "descriptor": "white peach", "intensity": "medium"},
                    {"tier": "secondary", "descriptor": "toasted almond", "intensity": "medium+"},
                    {"tier": "secondary", "descriptor": "brioche", "intensity": "medium"},
                    {"tier": "tertiary", "descriptor": "honey", "intensity": "medium"},
                    {"tier": "tertiary", "descriptor": "beeswax", "intensity": "medium-"},
                ],
                "palate_sweetness": "bone_dry", "palate_acidity": "high", "palate_body": "full",
                "palate_mousse": "creamy",
                "palate_finish": "very_long", "palate_finish_sec": 52, "palate_intensity": "pronounced",
                "palate_descriptors": [
                    {"tier": "primary", "descriptor": "lemon", "intensity": "medium"},
                    {"tier": "secondary", "descriptor": "walnut", "intensity": "medium"},
                    {"tier": "tertiary", "descriptor": "chalk", "intensity": "medium+"},
                ],
                "quality": "outstanding", "readiness": "drink_now",
                "personal_score": 97.0,
                "free_note": "Krug's most singular expression — just Chardonnay from the 2.68ha plot in Le Mesnil. The precision is extraordinary. Business dinner in London; not quite the right context but impossible to ignore.",
                "pairing_notes": "Sole meunière",
            },
        ]

        for note_data in notes:
            nid = uid()
            import json
            await db.execute(text("""
                INSERT INTO tasting_notes
                  (id, user_id, wine_id, cellar_entry_id, vintage, tasted_at,
                   occasion, location, decant_minutes, companions,
                   app_clarity, app_intensity, app_color,
                   nose_intensity, nose_development, nose_descriptors,
                   palate_sweetness, palate_acidity, palate_tannin, palate_tannin_nature,
                   palate_alcohol, palate_body, palate_mousse,
                   palate_finish, palate_finish_sec, palate_intensity,
                   palate_descriptors,
                   quality, readiness, personal_score,
                   free_note, pairing_notes,
                   created_at)
                VALUES
                  (:id, :uid, :wid, :ceid, :vintage, :tasted_at,
                   :occasion, :location, :decant, :companions,
                   :app_c, :app_i, :app_col,
                   :nose_i, :nose_d, CAST(:nose_desc AS jsonb),
                   :pal_sw, :pal_ac, :pal_ta, :pal_tan,
                   :pal_al, :pal_bo, :pal_mo,
                   :pal_fi, :pal_fis, :pal_in,
                   CAST(:pal_desc AS jsonb),
                   :quality, :readiness, :score,
                   :free_note, :pairing,
                   now())
            """), {
                "id": nid,
                "uid": USER_ID,
                "wid": note_data["wine_id"],
                "ceid": note_data.get("cellar_entry_id"),
                "vintage": note_data["vintage"],
                "tasted_at": note_data["tasted_at"],
                "occasion": note_data.get("occasion"),
                "location": note_data.get("location"),
                "decant": note_data.get("decant_minutes"),
                "companions": note_data.get("companions", []),
                "app_c": note_data.get("app_clarity"),
                "app_i": note_data.get("app_intensity"),
                "app_col": note_data.get("app_color"),
                "nose_i": note_data.get("nose_intensity"),
                "nose_d": note_data.get("nose_development"),
                "nose_desc": json.dumps(note_data.get("nose_descriptors", [])),
                "pal_sw": note_data.get("palate_sweetness"),
                "pal_ac": note_data.get("palate_acidity"),
                "pal_ta": note_data.get("palate_tannin"),
                "pal_tan": note_data.get("palate_tannin_nature"),
                "pal_al": note_data.get("palate_alcohol"),
                "pal_bo": note_data.get("palate_body"),
                "pal_mo": note_data.get("palate_mousse"),
                "pal_fi": note_data.get("palate_finish"),
                "pal_fis": note_data.get("palate_finish_sec"),
                "pal_in": note_data.get("palate_intensity"),
                "pal_desc": json.dumps(note_data.get("palate_descriptors", [])),
                "quality": note_data.get("quality"),
                "readiness": note_data.get("readiness"),
                "score": note_data.get("personal_score"),
                "free_note": note_data.get("free_note"),
                "pairing": note_data.get("pairing_notes"),
            })

        print(f"Inserted {len(notes)} tasting notes.")

        # ── WISHLIST ──────────────────────────────────────────────────────────
        print("Seeding wishlist...")

        wishlist_rows = [
            (uid(), WINES["drc_rc"],       None,  5, "On the list. One day.", "sommelier_rec",    27500.00, None),
            (uid(), WINES["leroy"],         2015,  4, "Heard from a Burgundy merchant it's drinking better than the GC right now.", "friend", 8500.00, None),
            (uid(), WINES["rousseau_ch"],   2018,  4, "The 2015 was transcendent; want a comparison vintage.", "personal", 2100.00, None),
            (uid(), WINES["conterno_mf"],   2016,  3, "Monfortino 2016 is supposed to be exceptional. Would take the 750ml.", "article", 350.00, None),
            (uid(), WINES["harlan"],        2018,  3, "Second bottle for the vertical.", "personal", 1050.00, 1150.00),
            (uid(), None,                   None,  2, "Giacomo Conterno Barolo Cascina Francia 2019 or 2020", "article", 210.00, None),
        ]

        for row in wishlist_rows:
            (wid, wine_id, vintage, priority, reason, source, est_price, mkt_price) = row
            await db.execute(text("""
                INSERT INTO wishlist (id, user_id, wine_id, vintage, priority, reason, source, estimated_price, market_price, added_at)
                VALUES (:id, :uid, :wid, :vintage, :priority, :reason, :source, :est, :mkt, now())
            """), {
                "id": wid, "uid": USER_ID, "wid": wine_id, "vintage": vintage,
                "priority": priority, "reason": reason, "source": source,
                "est": est_price, "mkt": mkt_price,
            })

        print(f"Inserted {len(wishlist_rows)} wishlist entries.")

        await db.commit()
        print("\nDone! Summary:")
        print(f"  {len(cellar_rows)} cellar entries")
        print(f"  {len(notes)} tasting notes")
        print(f"  {len(wishlist_rows)} wishlist entries")


if __name__ == "__main__":
    asyncio.run(seed())
