# Mosaic Bond: attribution & licenses

(The app was formerly called Mosaic Bond. Internal folder names, cache names and storage keys keep the old name so saved data is preserved.)

## BodyParts3D (anatomical meshes)
- Attribution: BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International
- License: CC BY 4.0 (current license page, checked 2026-11-01). The downloaded OBJ files (BP3D 4.0, partof + isa sets) carry an older header: “BodyParts3D, (c) The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan”. To be safe, the derived model file (models/body.glb) is also offered under CC BY-SA 2.1 JP.
- Source: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
- Notes: Modified: grouped by body part, decimated (fast-simplification), axis-converted, meshopt-compressed with gltf-transform. v18: the brain, skin shell and kidney cortex are BodyParts3D meshes. All other internal anatomy comes from Z-Anatomy, which is itself derived from BodyParts3D (see below).

## three.js r160 (incl. GLTFLoader, BufferGeometryUtils)
- Attribution: Copyright © 2010-2023 three.js authors
- License: MIT
- Source: https://github.com/mrdoob/three.js/blob/r160/LICENSE

## meshoptimizer decoder (meshopt_decoder.module.js)
- Attribution: Copyright (c) 2016-2023 Arseny Kapoulkine
- License: MIT
- Source: https://github.com/zeux/meshoptimizer/blob/master/LICENSE.md
- Notes: Uses WebAssembly; CSP adds 'wasm-unsafe-eval' to script-src for this decoder only.

## Data
- USDA FoodData Central SR Legacy (public domain/CC0).
- NIH ODS, NIDDK, NHLBI, NIAMS, MedlinePlus, FDA/DailyMed: U.S. government works; see data/citations.json.

## Mesh groups (part id: source objects, original triangles -> shipped triangles)
- bones: 304 objects, 755208 -> 89999
- blood: 398 objects, 1070816 -> 29999
- lungs: 122 objects, 156118 -> 11999
- vessels: 639 objects, 970998 -> 44999
- heart: 24 objects, 109578 -> 14999
- brain: 97 objects, 449496 -> 30000
- eyes: 42 objects, 309130 -> 6080
- liver: 19 objects, 19918 -> 9999
- muscles: 424 objects, 2426528 -> 154849
- gut: 67 objects, 73234 -> 14998
- stomach: 2 objects, 2388 -> 2388
- pancreas: 4 objects, 16962 -> 2999
- skin: 1 objects, 203382 -> 29999
- bladder: 2 objects, 666 -> 666
- reproductive: 10 objects, 5130 -> 5130
- teeth: 30 objects, 43510 -> 6000
- kidneys: 4 objects, 9278 -> 5000
- immune: 3 objects, 3410 -> 3410
- glands: 3 objects, 7454 -> 1999
- nerves: 39 objects, 47826 -> 11999
- (v17 and earlier) Spinal cord and peripheral nerves were placeholder tubes. Since v18 they are real Z-Anatomy meshes.

## Sex, age and body-size display (visual approximations / placeholders)
- BodyParts3D models one adult male. No freely licensed, redistributable female whole-body anatomy model compatible with this app was found, (v17 and earlier) so the uterus, ovaries and fallopian tubes were placeholder shapes. **Since v18 they are real Visible Human Female meshes (HuBMAP HRA, see below). Breast tissue is still a procedural contour (approximate)**, and the female skin-shell shaping (hips, shoulders, chest) is procedural. Male reproductive meshes are hidden in female mode.
- Age: overall height follows the height you enter; head-to-body ratio per DRI age band is a **visual approximation** (not from growth-chart data).
- Weight/BMI: only the skin shell's girth (torso, hips, limbs) is scaled, smoothly, around the skeleton; skeleton and organs stay fixed. **Visual approximation.**
- Internal anatomy is not age-, sex- or weight-specific.

## Cellular Health & Spiritual Health (v8)
- Cellular Health: the antioxidant-nutrient score is the mean % of DRI target (capped at 100%) for vitamin C, vitamin E, selenium, zinc, copper, manganese and riboflavin. It uses sentences quoted from NIH ODS fact sheets. It is **not** a measurement of oxidative stress. ORAC values are not used, because USDA ARS withdrew its ORAC table in 2012; the withdrawal notice is cited from an Internet Archive copy. Carotenoids are not scored: the bundled data has vitamin A as RAE only. The cell diagram is a schematic.
- Spiritual Health: opt-in, stored only on this device, no doctrinal content. The findings are quoted from PubMed abstracts (PMIDs 27183175, 27393076, 24395196, 23762764) and the NCCIH meditation page. Tiers: cohorts T3, meta-analysis of RCTs T2, narrative review T4. Most of the evidence is observational, and no supernatural effects are claimed.

## v9 — Cycle, Exercise & female body shaping
- **Cycle tab**: cycle day, phase, averages and next-period dates are simple calendar estimates. They are NOT contraception or fertility guidance. Sources: ACOG (heavy bleeding, AUB, dysmenorrhea, PMS, puberty), NICHD, MedlinePlus, ODS. The CDC heavy-bleeding pages returned HTTP 403 to our fetcher, so ACOG pages are cited instead. No sourced statement was found linking thiamin or omega-3 to menstrual symptoms, so neither is shown.
- **Exercise tab**: MET values come from the 2024 Adult Compendium of Physical Activities (pacomp-2024). Weekly targets come from the Physical Activity Guidelines for Americans, 2nd ed. Stretching guidance is limited to what the ACSM position-stand abstract states. Sweat sodium/potassium amounts are not quantified, so we only show today's logged Na/K. Energy (MET × kg × h) is an estimate. Muscle and joint regions are approximate geometric tags on the merged BodyParts3D muscle mesh. They are not segmented anatomy.
- **Female body**: BodyParts3D is male-only. When sex = F, the male reproductive meshes and the penile urethra are hidden, the groin of the skin shell is flattened, and a smooth breast contour is blended into the skin and superficial muscle shells. The former placeholder spheres were removed. The jaw is slightly narrowed. The skeleton and organs stay adult-male anatomy, and the female organs (uterus, ovaries, tubes) are stylized placeholders. (Superseded in v18: real female reproductive organs; see the v18 section.)

## v10: Cancer-link flags
- Classifications come from IARC Monographs: "Agents Classified, Vols 1–142" (the table text was read from a copy of IARC's official PDF export, because the official page renders it dynamically) and "List of classifications by cancer site". IARC's own explanation of what a group means is quoted from the IARC Monographs Q&A. The absolute-risk context (18% per 50 g/day of processed meat; 17% per 100 g/day of red meat, if causal) is quoted from the IARC Vol. 114 Q&A and press release 240.
- Evidence grades come from the WCRF/AICR recommendation-evidence pages (processed meat: convincing; red meat: probable; alcohol: strong, stomach: probable; Cantonese-style salted fish: strong). Acrylamide, HCA/PAH and aflatoxin context comes from the NCI fact sheets.
- Medicine warnings come from FDA labels (openFDA/DailyMed): combined OCs, methotrexate, tamoxifen, estradiol, adalimumab and pioglitazone. The ranitidine entry uses the FDA 2020 withdrawal notice and is shown as historical. Of these, only ethinyl estradiol and methotrexate are in the app's med list. The rest are shown for reference.
- Cancer-site mapping to the 3D model is coarse: colorectum, oesophagus and nasopharynx-adjacent sites map to whole-organ meshes (gut, lungs).

## v13 — Redesign + cancer-linked meds
- New light theme with system font and a 5-tab navigation (Body · Food · Health · Track · More). The realistic 3D render is now the default; holographic is optional.
- Added to the med list from FDA labeling (DailyMed set IDs via openFDA, T1): tamoxifen (Soltamox), estradiol, adalimumab (Idacio), infliximab (Zymfentra), etanercept (Enbrel), pioglitazone. Built by /workspace/build10.py. Unmatched quotes were dropped.

## Barcode scanning (v16)
- **ZXing for JavaScript** (`@zxing/library` 0.21.3), Apache License 2.0 — vendored as `vendor/zxing.min.js`; license in `vendor/ZXING-LICENSE.txt`. Runs locally; no network use.
- **USDA FoodData Central — Branded Foods** (optional, opt-in online lookup via api.nal.usda.gov). Public domain (CC0) U.S. government data; nutrient values are manufacturer-submitted label data.
- **Open Food Facts** (optional, per-tap fallback). Data © Open Food Facts contributors, licensed under the Open Database License (ODbL) v1.0; crowd-sourced, shown as tier T4.

## Rendering upgrade (v17)
- **Studio Small 09 HDRI** by Sergej Majboroda, Poly Haven — CC0 1.0 (public domain). Vendored as `env/studio_small_09_1k.hdr`; used only for image-based lighting.
- **RGBELoader.js** from three.js r160 examples — MIT License (© three.js authors). Vendored as `vendor/RGBELoader.js`.
- Anatomy meshes are unchanged: BodyParts3D, © The Database Center for Life Science, CC BY-SA 2.1 Japan. Only the vertex normals are recomputed at load time (smooth shading). No vertex positions are moved, so the shapes stay the same.


## v18: anatomy model swap (Z-Anatomy + HuBMAP HRA female organs)
Licences were checked on the official pages on 2026-11-01 (America/Indianapolis).

### Z-Anatomy (internal anatomy)
- Source: https://github.com/LluisV/Z-Anatomy. Meshes are from the system FBX files and the Z-Anatomy Blender template (`Startup.blend`).
- Licence: the repository README (default branch `PC-Version`) says: "This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License" (http://creativecommons.org/licenses/by-sa/4.0/). The repository LICENSE file is GPL-3.0 and covers the Blender-based software, which this app does not use.
- Template License.txt, quoted: "Please be sure attribute any content copied or derived from the content of this file as follows: -"BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan" -"Z-Anatomy - The open source atlas of anatomy - CC-BY-SA 4.0" ... You must distribute any derivative work based on part or whole of the data from this database under the same license."
- Required attribution: **BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan** and **Z-Anatomy - The open source atlas of anatomy - CC-BY-SA 4.0**.
- Included third-party model: **Cranial Nerves and Foramina - by University of Dundee, CAHID - CC-BY 4.0** (kept, credited).
- **Excluded for licence reasons:**
  - "Anatomy of the Inner Ear - University of Dundee School of Medicine - CC-BY-NC-SA 4.0" (non-commercial).
  - "Kidney - by lissiecowley - CC-BY-NC 4.0" (non-commercial). The BodyParts3D kidney is used instead.
  - "Brainder" and "White matter" (University of Washington): no licence stated. The BodyParts3D brain is used instead.
- Wikipedia definitions (CC BY-SA 3.0/GFDL) are not used.
- Modifications:
  - Axis conversion.
  - Similarity alignment to the BodyParts3D frame (ICP on bones, scale 0.9925, residual about 1 cm).
  - Per-object decimation with fast-simplification. Small structures keep at least 80 triangles, and the thyroid is kept at full detail.
  - Grouped by body system and meshopt-compressed with gltf-transform.
- Left out because they would hide or duplicate other structures: fascia, bursae, aponeuroses, retinacula, tendon sheaths, inner spinal-cord tracts, liver segments, pleura, stomach mucosa and omentum.
- **The derived files models/body.glb and models/body_lo.glb are distributed under CC BY-SA 4.0** (share-alike).

### HuBMAP Human Reference Atlas: 3D Reference Organ Set for Female v1.10
- Source: https://lod.humanatlas.io/ref-organ/united-female/v1.10, file `3d-vh-f-united.glb`. Licence on that page: https://creativecommons.org/licenses/by/4.0/ (**CC BY 4.0**).
- Citation: Browne, Kristen, and Heidi Schlehlein. 2026. *3D Reference Organ Set for Female, v1.10*. https://doi.org/10.48539/HBM637.DWBM.744. Created using data from the Visible Human Dataset, National Library of Medicine (Spitzer and Whitlock 2002).
- Used, shown only in female view:
  - Uterus (body, fundus, lower uterine segment), cervix, cervicovaginal junction and vagina.
  - Fallopian tubes (ampulla, isthmus, infundibulum, fimbriae) and ovaries.
  - Ovarian, suspensory, round ligaments and mesovarium.
  - Uterine arteries and veins.
- Modified: aligned to the model pelvis by similarity ICP on ilium, sacrum, coccyx and femurs (scale 0.845), then decimated. **Size and position are approximate**, because they are fitted from one 59-year-old woman to the male skeleton.
- **Female pelvis: not available.** This set contains only the ilium, sacrum and coccyx, with no pubis or ischium, so a complete female pelvis could not be built. The pelvis stays the male Z-Anatomy/BodyParts3D bone.
- Breast tissue (mammary lobes) is in the set but not used: its position does not match this model's procedural breast contour.

### Other sources checked for female anatomy (2026-11-01)
- **Z-Anatomy and BodyParts3D:** male only.
- **NIH 3D:** licences are set per entry. Its Visible Human Female organs are the same HRA models.
- **Sketchfab MRI pelvis (audreybyrd):** no licence stated. Not used.
- **AnatomyTOOL Vallance model:** CC BY, but it is an illustrator's model, not derived from medical data. Not used.

### MakeHuman
- **Not used in v18.** The base mesh and targets are CC0 1.0 (makehuman LICENSE.md). The BodyParts3D skin shell already fits the Z-Anatomy skeleton within about 1.2 cm (checked per limb segment by ICP), so it was kept as the skin for both sexes. Sex, age and weight shaping is still procedural and **approximate**.

## v19 vendored libraries (served same-origin, loaded only when used)
- **Tesseract.js** v5 (`vendor/tess/tesseract.esm.min.js`, `worker.min.js`) — Apache License 2.0, © Jerome Wu and contributors. See `vendor/tess/TESSERACTJS-LICENSE`.
- **tesseract.js-core** (`vendor/tess/core/*.wasm.js`, Tesseract OCR engine compiled to WebAssembly) — Apache License 2.0, © Google / Tesseract contributors. See `vendor/tess/core/LICENSE`.
- **English trained data** `eng.traineddata` (tessdata_best, integerized, 4.0.0_best_int) — Apache License 2.0, tesseract-ocr/tessdata project.
- **fflate** (`vendor/fflate.js`, streaming ZIP for Apple Health export.zip) — MIT License, © Arjun Barrett. See `vendor/FFLATE-LICENSE`.
