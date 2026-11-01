#!/usr/bin/env python3
"""Turkish legislative XML v2 quality control: XSD + source-derived business checks.

This is NOT a legal-validity determination. Typography and authority of an
instrument must be checked in its actual rendered/published form.
"""
import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path
from lxml import etree

NS = "urn:eyuik:legislation:tr:v1"
Q = lambda local: "{%s}%s" % (NS, local)
ALPHABET = "abc" + "\u00e7" + "defg" + "\u011f" + "h" + "\u0131" + "ijklmno" + "\u00f6" + "prs" + "\u015f" + "tu" + "\u00fc" + "vyz"
REGULAR_NUMBER = re.compile(r"^[1-9][0-9]*(?:/[A-Z\u00c7\u011e\u0130\u00d6\u015e\u00dc])?$")
ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
SHA = re.compile(r"^[0-9a-fA-F]{64}$")


def direct(node, name):
    return node.find(Q(name)) if node is not None else None


def children(node, name):
    return node.findall(Q(name)) if node is not None else []


def text(node, name):
    x = direct(node, name)
    return "" if x is None else (x.text or "").strip()


def classify(root):
    meta = direct(root, "metadata")
    x = direct(meta, "classification")
    return (x.get("kind", "") if x is not None else "",
            x.get("form", "") if x is not None else "",
            x.get("stage", "") if x is not None else "",
            x.get("publicationChannel", "") if x is not None else "", x)


def label_article(a):
    kind = a.get("kind") or ("gecici" if a.get("temporary") == "true" else "normal")
    token = {"normal": "MADDE", "ek": "EK MADDE", "gecici": "GE\u00c7\u0130C\u0130 MADDE", "cerceve": "MADDE"}.get(kind, "MADDE")
    return token + " " + (a.get("number") or "?")


def get_articles(root):
    return root.xpath(".//tr:article", namespaces={"tr": NS})


def run_checks(tree, xsdschema=None):
    root = tree.getroot()
    msgs = []
    def emit(severity, code, location, message):
        msgs.append({"severity": severity, "code": code, "location": location, "message": message})
    if xsdschema is not None and not xsdschema.validate(tree):
        for err in xsdschema.error_log:
            emit("error", "XSD", "line " + str(err.line), err.message)
        return msgs
    schema_version = root.get("schemaVersion", "")
    is_v2 = schema_version == "2.0"
    meta = direct(root, "metadata")
    kind, form, stage, channel, cx = classify(root)
    src = direct(meta, "source")
    ver = direct(meta, "version")
    uploaded = direct(meta, "file")
    title = text(meta, "title")
    articles = get_articles(root)
    segments = root.xpath(".//tr:segment", namespaces={"tr": NS})

    if is_v2 and cx is None:
        emit("error", "CLASSIFICATION", "metadata", "v2.0 icin classification bilgisi zorunludur.")
    elif not is_v2 and cx is None:
        emit("info", "LEGACY", "metadata", "1.0 arsiv formati korundu; belge sinifi bilinmiyor.")

    if is_v2 and stage == "taslak" and kind != "genelge" and not title:
        emit("error", "TITLE", "metadata/title", "Taslak adi zorunlu (m.10/1).")
    elif title and stage == "taslak" and title != title.upper():
        emit("warning", "TITLE_CASE", "metadata/title", "Taslak adi buyuk harfle yazilmali (m.11/1).")
    elif title and stage == "yayinlanmis" and title != title.upper():
        emit("info", "TITLE_CASE", "metadata/title", "Yayimlanmis metnin orijinal basligini kontrol edin.")

    if uploaded is not None:
        digest = uploaded.get("sha256", "").strip()
        if digest and not SHA.fullmatch(digest):
            emit("error", "SHA256", "metadata/file", "SHA-256 64 hexadecimal karakter olmali.")
        if not digest:
            emit("warning", "SHA256_MISSING", "metadata/file", "Kaynak dosya SHA-256 ozeti eksik.")
    if src is not None:
        dat = src.get("publicationDate", "")
        if stage == "yayinlanmis" and channel == "resmi-gazete" and not dat:
            emit("warning", "PUBLICATION_DATE", "metadata/source", "Resmi Gazete yayim tarihi eksik.")
        if stage == "yayinlanmis" and channel == "resmi-gazete" and not src.get("number"):
            emit("warning", "GAZETTE_NUMBER", "metadata/source", "Resmi Gazete sayisi eksik.")
    if ver is not None and stage in ("yayinlanmis", "konsolide") and not ISO_DATE.fullmatch(ver.get("date", "")):
        emit("warning", "VERSION_DATE", "metadata/version", "Yayimlanmis surum tarihi YYYY-MM-DD olmalidir.")

    if is_v2 and stage == "taslak":
        draft = direct(meta, "draftMaterials")
        justification = text(draft, "generalJustification")
        if kind != "genelge" and not justification:
            emit("error", "GENERAL_REASON", "metadata/draftMaterials", "Genel gerekce zorunlu (m.10/1, m.23).")
        if kind in ("kanun", "cumhurbaskanligi-kararnamesi"):
            justifications = children(draft, "articleJustification")
            refs = {x.get("articleRef", "") for x in justifications}
            for a in articles:
                if a.get("id") not in refs:
                    emit("error", "ARTICLE_REASON", label_article(a), "Madde gerekcesi eksik (m.10/1, m.23).")
            if direct(draft, "impactAnalysis") is None:
                emit("error", "IMPACT_ANALYSIS", "metadata/draftMaterials", "Kanun/CBK taslagi icin etki analizi kaydi eksik (m.10/1, m.26).")
        if cx is not None and cx.get("budgetImpactExpected") == "true" and direct(draft, "budgetImpactForm") is None:
            emit("error", "BUDGET_IMPACT", "metadata/draftMaterials", "Butce etki formu gerekli olarak isaretlenmis ama eksik (m.10/1, m.27).")

    if is_v2 and not articles and kind not in ("genelge", "teblig"):
        emit("error", "NO_ARTICLES", "legislation", "Bu mevzuat turu icin maddeler bulunamadi (m.10/2).")
    if segments and is_v2 and kind not in ("genelge", "teblig"):
        emit("warning", "FREEFORM", "segment", "Maddesiz bolumleme m.10/2 istisnasina gore kontrol edilmeli.")
    if channel == "resmi-gazete" and kind in ("talimat", "yonerge"):
        emit("warning", "OFFICIAL_NAME", "classification", "m.11/4: RG'de yonetmelik disi duzenleyici islem adlandirmasini ve ozel dayanak istisnasini kontrol edin.")

    # XML authors should choose book > part > chapter > article when needed.
    for division_name in ("book", "part", "chapter"):
        for element in root.xpath(".//tr:" + division_name, namespaces={"tr": NS}):
            name = (element.get("title") or "").strip()
            if not name:
                emit("error", "DIVISION_TITLE", division_name, "Kitap/kisim/bolum basligi zorunlu (m.12/2).")
            ordinal = (element.get("ordinal") or "")
            if ordinal and ordinal != ordinal.upper():
                emit("warning", "DIVISION_ORDINAL", name, "Kitap/kisim/bolum sira ifadesi buyuk harfle olmalidir (m.12/2).")

    regular_nums = []
    extra_nums = []
    temp_nums = []
    for a in articles:
        loc = label_article(a)
        if is_v2 and not a.get("kind"):
            emit("error", "ARTICLE_KIND", loc, "v2.0 icin madde turu (normal/ek/gecici/cerceve) belirtilmeli.")
        akind = a.get("kind") or ("gecici" if a.get("temporary") == "true" else "normal")
        anum = a.get("number", "")
        if not REGULAR_NUMBER.fullmatch(anum):
            emit("error", "ARTICLE_NUMBER", loc, "Madde numarasi N veya N/A biciminde olmali (m.13/3, m.16/2).")
        if akind in ("ek", "gecici") and "/" in anum:
            emit("warning", "SPECIAL_NUMBER", loc, "Ek/gecici maddelerin ayri numara serisi korunmali (m.16).")
        try:
            n = int(anum)
            if akind == "normal": regular_nums.append(n)
            elif akind == "ek": extra_nums.append(n)
            elif akind == "gecici": temp_nums.append(n)
        except ValueError:
            pass
        heading = (a.get("heading") or "").strip()
        if is_v2 and akind != "cerceve" and not heading and a.get("status") not in ("mulga", "iptal"):
            emit("error", "ARTICLE_HEADING", loc, "Madde/ek/gecici madde basligi zorunludur (m.14/1).")
        if is_v2 and akind == "cerceve" and heading:
            emit("error", "FRAME_HEADING", loc, "Cerceve maddeye baslik konulmaz (m.14/1).")
        if heading and heading[-1] in ".!?;:":
            emit("warning", "HEADING_PUNCT", loc, "Madde basliginin sonunda noktalama bulunmamali (m.14/3).")
        if heading and heading[0] != heading[0].upper():
            emit("warning", "HEADING_CASE", loc, "Madde basliginin ilk harfi buyuk olmali (m.14/3).")
        if a.get("temporary") == "true" and akind != "gecici":
            emit("error", "TEMPORARY_MISMATCH", loc, "temporary=true ve kind birbiriyle celisiyor.")
        if akind == "gecici" and a.get("temporary") == "false":
            emit("error", "TEMPORARY_MISMATCH", loc, "kind=gecici ve temporary=false celisiyor.")
        pars = children(a, "paragraph")
        if not pars and not children(a, "amendment") and a.get("status") not in ("mulga", "iptal"):
            emit("error", "EMPTY_ARTICLE", loc, "Madde bos olamaz.")
        para_nums = []
        for p in pars:
            pn = p.get("number")
            if is_v2 and akind == "cerceve" and pn is not None:
                emit("error", "FRAME_PARA_NUMBER", loc, "Cerceve madde fikralari numaralandirilmaz (m.13/2).")
            if is_v2 and akind != "cerceve" and pn is None:
                emit("error", "PARA_NUMBER", loc, "Fikra numarasi zorunlu; tek fikra da (1) (m.13/2).")
            if pn is not None:
                para_nums.append(int(pn))
            bent_labels = []
            for b in children(p, "item"):
                bend = b.get("label", "")
                bent_labels.append(bend)
                if not text(b, "text"):
                    emit("warning", "EMPTY_BENT", loc + "/" + bend, "Bent metni bos.")
                subs = [int(x.get("number")) for x in children(b, "item") if x.get("number", "").isdigit()]
                if len(subs) != len(set(subs)):
                    emit("error", "DUP_ALT_BENT", loc + "/" + bend, "Ayni bent icinde alt bent numarasi tekrarlaniyor.")
                if subs and subs != list(range(1, len(subs) + 1)):
                    emit("warning", "ALT_BENT_SEQUENCE", loc + "/" + bend, "Alt bent numaralarinin sirasini kontrol edin.")
            if len(bent_labels) != len(set(bent_labels)):
                emit("error", "DUP_BENT", loc + "/" + str(pn), "Fikrada bent etiketi tekrar ediyor.")
            expected = [ALPHABET[i % len(ALPHABET)] * (1 + i // len(ALPHABET)) for i in range(len(bent_labels))]
            if bent_labels and bent_labels != expected:
                emit("warning", "BENT_SEQUENCE", loc + "/" + str(pn), "Turk alfabesi a,b,c,...,z,aa,bb,... sirasini kontrol edin (m.13/2).")
        if len(para_nums) != len(set(para_nums)):
            emit("error", "DUP_PARA", loc, "Fikra numarasi tekrarlaniyor.")
        if para_nums and para_nums != list(range(1, len(para_nums) + 1)):
            emit("warning", "PARA_SEQUENCE", loc, "Fikra numaralarinin sirasini kontrol edin.")
        if "tan\u0131m" in heading.casefold():
            emit("info", "DEFINITIONS_ORDER", loc, "Tanimlari alfabetik siraya gore ayrica kontrol edin (m.13/4).")

    for kind_label, nums in [("normal", regular_nums), ("ek", extra_nums), ("gecici", temp_nums)]:
        repeated = [x for x, count in Counter(nums).items() if count > 1]
        if repeated:
            emit("error", "DUP_ARTICLE", kind_label, "Madde numarasi ayni tur icinde tekrar ediyor: " + str(repeated))
    if is_v2 and form == "cerceve" and any((a.get("kind") or "") != "cerceve" for a in articles):
        emit("error", "FRAME_KIND", "legislation", "Cerceve taslaktaki dis maddeler kind=cerceve olmali.")
    if is_v2 and form == "mustakil" and any(a.get("kind") == "cerceve" for a in articles):
        emit("error", "STANDALONE_KIND", "legislation", "Mustakil metinde cerceve maddeler dis duzeyde yer alamaz.")

    # Art.16(1): extra articles come before temporary/effective-date articles.
    # Warn only: old consolidated/changed documents can retain historical numbering.
    positions = {"ek":[],"gecici":[],"effective":[],"execution":[]}
    for i, a in enumerate(articles):
        akind = a.get("kind") or ("gecici" if a.get("temporary") == "true" else "normal")
        if akind in ("ek", "gecici"):
            positions[akind].append(i)
        heading = (a.get("heading") or "").casefold().strip()
        if heading == "y\u00fcr\u00fcrl\u00fck": positions["effective"].append(i)
        if heading == "y\u00fcr\u00fctme": positions["execution"].append(i)
    for i in positions["ek"]:
        if any(i > j for j in positions["gecici"] + positions["effective"]):
            emit("warning", "EXTRA_ARTICLE_POSITION", "legislation", "Ek madde, varsa gecici maddelerden ve yururluk maddesinden once gelmeli (m.16/1).")
    for i in positions["gecici"]:
        if any(i > j for j in positions["effective"]):
            emit("warning", "TEMP_ARTICLE_POSITION", "legislation", "Gecici maddenin yururluk maddesine gore yerini kontrol edin (m.15-16).")

    # The legally expected location of final articles is contextual, not strict.
    if form == "mustakil" and articles:
        headings = [(a.get("heading") or "").casefold().strip() for a in articles]
        if "y\u00fcr\u00fcrl\u00fck" in headings and "y\u00fcr\u00fctme" in headings:
            if headings.index("y\u00fcr\u00fctme") < headings.index("y\u00fcr\u00fcrl\u00fck"):
                emit("warning", "FINAL_ORDER", "legislation", "Yurutme maddesi yururlukten once bulunuyor; m.15'i kontrol edin.")
    if root.get("language", "").lower() != "tr":
        emit("warning", "LANGUAGE", "legislation", "Turk mevzuati taslaginin dili Turkce olmalidir (m.25/1).")
    emit("info", "TYPOGRAPHY", "publication", "Kalin, buyuk harf, altini cizmeme, paragraf girintisi ve noktalama DOCX/PDF/HTML ciktisinda ayrica kontrol edilmelidir; XSD bu bicimleri dogrulayamaz.")
    return msgs


def main(argv=None):
    parser = argparse.ArgumentParser(description="Validate Turkish legislative XML against XSD and drafting checks")
    parser.add_argument("xml", type=Path)
    parser.add_argument("--schema", type=Path, default=Path(__file__).resolve().parent.parent / "TR_Mevzuat_Semasi_v2_0.xsd")
    parser.add_argument("--json", type=Path, help="Write diagnostics JSON")
    parser.add_argument("--strict", action="store_true", help="Fail also when warnings exist")
    args = parser.parse_args(argv)
    try:
        schema = etree.XMLSchema(etree.parse(str(args.schema)))
        doc = etree.parse(str(args.xml))
        msgs = run_checks(doc, schema)
    except (OSError, etree.XMLSyntaxError, etree.XMLSchemaParseError) as e:
        msgs = [{"severity": "error", "code": "INPUT", "location": str(args.xml), "message": str(e)}]
    stats = dict(Counter(x["severity"] for x in msgs))
    report = {"file": str(args.xml), "schema": str(args.schema), "summary": stats, "diagnostics": msgs,
              "decision": "fail" if stats.get("error", 0) or (args.strict and stats.get("warning", 0)) else "pass"}
    if args.json:
        args.json.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if report["decision"] == "fail" else 0


if __name__ == "__main__":
    sys.exit(main())
