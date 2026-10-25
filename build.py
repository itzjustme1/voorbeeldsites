"""Builds index.html (NL) and en/index.html (EN) from one template. Run: python3 build.py"""
import html, pathlib

ROOT = pathlib.Path(__file__).parent
MAIL = "vbdgrijff@gmail.com"
BASE = "https://itzjustme1.github.io/voorbeeldsites/"

PROJECTS = [
    ("tom-walsh-flooring", "Tom Walsh Flooring"),
    ("pisa-ijs", "Pisa IJs"),
    ("cheers-slijterij", "Slijterij Cheers"),
    ("notenshop-daamen", "Notenshop Daamen"),
]

T = {
    "nl": dict(
        lang="nl", prefix="", other="en/", other_lang="en",
        title="Valentijn de Grijff · Websites die werken op elke telefoon",
        desc="Snelle, strakke websites voor kleine bedrijven, gemaakt door Valentijn de Grijff (16). Eerst een gratis preview van je eigen site, daarna pas beslissen.",
        skip="Naar de inhoud", cta_small="Gratis preview",
        subject="Gratis%20preview%20van%20mijn%20website",
        h1='Websites die werken op <span class="accent">elke telefoon.</span>',
        lead="Ik ben Valentijn, 16 jaar, webdesigner uit Nederland. Ik bouw snelle, strakke websites voor kleine bedrijven. En voordat je iets betaalt, krijg je gratis een preview van je eigen site.",
        btn="Gratis preview aanvragen", see="Bekijk het werk",
        fine="Gratis en vrijblijvend. Een nieuwe site vanaf €100.",
        st_h="De meeste bezoekers komen via hun telefoon.",
        st_p="Is je site gemaakt voor een groot scherm, dan zien ze piepkleine tekst en knoppen waar je niet op kunt tikken. Elke site die ik maak is eerst voor de telefoon ontworpen en ziet er op een groot scherm net zo goed uit.",
        work_h="Recent werk",
        work_p="Conceptsites die ik voor echte bedrijven heb gemaakt. Klik gerust door: het zijn volledig werkende previews.",
        open="Open de preview",
        projects=[
            ("Limerick, Ierland · Vloerenspecialist · Engelstalig", "Een stoere, industriële site voor een vloerenbedrijf dat al sinds 1982 vloeren legt, met een voor-en-na-slider voor hun eigen projectfoto's."),
            ("Amsterdam · IJssalon", "Een warme site voor een Italiaanse ijssalon uit 1935: het verhaal, 60+ seizoenssmaken, de Google-reviews en de route, allemaal binnen één tik."),
            ("Amsterdam · Slijterij", "Een buurtslijterij met het assortiment, de openingstijden en de route precies waar klanten ernaar zoeken."),
            ("Amsterdam · Notenbranderij", "Een rustige, overzichtelijke site voor een kleine zaak in De Pijp: vers gebrande noten, wat klanten zeggen en waar je de winkel vindt."),
        ],
        alt_d="Desktopversie van de conceptsite voor {}", alt_p="Telefoonversie van de conceptsite voor {}",
        steps_h="Zo werkt het",
        steps=[("Gratis preview", "Ik maak een preview van je nieuwe site met je eigen teksten en foto's. Kost niks, nergens aan vast."),
               ("Jij beslist", "Bevalt het? Dan schaven we het samen bij. Niks voor jou? Dan houdt het daar gewoon op."),
               ("Je nieuwe site", "Ik maak de site af en zorg dat hij goed werkt op elke telefoon, tablet en computer.")],
        prices_h="Prijzen", prices_p="Duidelijk vooraf, zonder verrassingen.",
        prices=[("Preview van je nieuwe website", "Om te zien of het klikt", "Gratis"),
                ("Website van één pagina", "Wie je bent, wat je doet en hoe mensen je bereiken", "€100"),
                ("Website met meerdere pagina's", "Aparte pagina's voor bijvoorbeeld diensten, werk en contact", "€250")],
        cta_h="Benieuwd hoe jouw website eruit kan zien?",
        cta_p="Stuur me de naam van je bedrijf of je huidige website, dan maak ik een gratis preview.",
        cta_btn="Mail Valentijn",
        note="Dit zijn conceptontwerpen, geen officiële websites van de genoemde bedrijven.",
    ),
    "en": dict(
        lang="en", prefix="../", other="../", other_lang="nl",
        title="Valentijn de Grijff · Websites that work on every phone",
        desc="Fast, clean websites for small businesses, made by Valentijn de Grijff (16). See a free preview of your own site first, then decide.",
        skip="Skip to content", cta_small="Free preview",
        subject="Free%20website%20preview",
        h1='Websites that work on <span class="accent">every phone.</span>',
        lead="I'm Valentijn, a 16-year-old web designer from the Netherlands. I build fast, clean websites for small businesses. And before you pay anything, you get a free preview of your own.",
        btn="Get a free preview", see="See the work",
        fine="Free, no obligation. A new site from €100.",
        st_h="Most of your visitors arrive on a phone.",
        st_p="If your site was built for a big screen, they get tiny text and buttons they can't tap. Every site I make is designed for the phone first, and it still looks sharp on a desktop.",
        work_h="Recent work",
        work_p="Concept sites I made for real businesses. Click through: they're fully working previews.",
        open="Open the preview",
        projects=[
            ("Limerick, Ireland · Flooring contractor", "A bold, industrial site for a flooring company that has been fitting floors since 1982, with a before-and-after slider for their own project photos."),
            ("Amsterdam · Ice cream parlour · In Dutch", "A warm site for an Italian ice cream parlour from 1935: the story, 60+ seasonal flavours, the Google reviews and the route, all one tap away."),
            ("Amsterdam · Wine & spirits shop · In Dutch", "A neighbourhood liquor store with the range, opening hours and directions right where customers look for them."),
            ("Amsterdam · Nut roastery · In Dutch", "A calm, simple site for a small shop in De Pijp: freshly roasted nuts, what customers say and where to find the shop."),
        ],
        alt_d="Desktop version of the concept site for {}", alt_p="Phone version of the concept site for {}",
        steps_h="How it works",
        steps=[("Free preview", "I make a preview of your new site with your own text and photos. It costs nothing and there are no strings attached."),
               ("You decide", "Like it? We fine-tune it together. Not for you? Then that's simply the end of it."),
               ("Your new site", "I finish the site and make sure it works properly on every phone, tablet and computer.")],
        prices_h="Prices", prices_p="Clear up front, no surprises.",
        prices=[("Preview of your new website", "To see if it clicks", "Free"),
                ("One-page website", "Who you are, what you do and how people reach you", "€100"),
                ("Multi-page website", "Separate pages for things like services, work and contact", "€250")],
        cta_h="Curious what your website could look like?",
        cta_p="Send me your business name or current website and I'll make you a free preview.",
        cta_btn="Email Valentijn",
        note="These are concept designs, not the official websites of the businesses shown.",
    ),
}

FAVICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#2747ff"/><path d="M9 9l7 15 7-15" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>\n'


def page(k):
    t = T[k]; p = t["prefix"]; e = html.escape
    mailto = f"mailto:{MAIL}?subject={t['subject']}"
    url = BASE + ("" if k == "nl" else "en/")
    nl_cur = ' aria-current="true"' if k == "nl" else ""
    en_cur = ' aria-current="true"' if k == "en" else ""
    nl_href = "./" if k == "nl" else "../"
    en_href = "en/" if k == "nl" else "./"

    projects = []
    for (slug, name), (meta, desc) in zip(PROJECTS, t["projects"]):
        projects.append(f'''        <article class="project">
          <div class="visual">
            <div class="browser">
              <div class="browser-bar" aria-hidden="true">{e(name)}</div>
              <img src="{p}assets/{slug}-desktop.jpg" width="1440" height="900" loading="lazy" decoding="async" alt="{e(t['alt_d'].format(name))}">
            </div>
            <div class="phone"><img src="{p}assets/{slug}-phone.jpg" width="780" height="1688" loading="lazy" decoding="async" alt="{e(t['alt_p'].format(name))}"></div>
          </div>
          <div>
            <h3>{e(name)}</h3>
            <p class="meta">{e(meta)}</p>
            <p class="desc">{e(desc)}</p>
            <a class="text-link" href="{p}{slug}/">{t['open']}<span class="sr-only"> {e(name)}</span></a>
          </div>
        </article>''')

    steps = "\n".join(f'''          <li><span class="num" aria-hidden="true">{i}</span><h3>{e(h)}</h3><p>{e(d)}</p></li>'''
                      for i, (h, d) in enumerate(t["steps"], 1))
    prices = "\n".join(f'''            <li><span class="what">{e(w)}<small>{e(s)}</small></span><span class="amount{' free' if i == 0 else ''}">{e(a)}</span></li>'''
                       for i, (w, s, a) in enumerate(t["prices"]))

    return f'''<!doctype html>
<html lang="{t['lang']}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>{e(t['title'])}</title>
<meta name="description" content="{e(t['desc'])}">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="nl" href="{BASE}">
<link rel="alternate" hreflang="en" href="{BASE}en/">
<meta name="theme-color" content="#ffffff">
<meta property="og:type" content="website">
<meta property="og:title" content="{e(t['title'])}">
<meta property="og:description" content="{e(t['desc'])}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{BASE}assets/tom-walsh-flooring-desktop.jpg">
<link rel="icon" href="{p}assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{p}assets/site.css">
</head>
<body>
<a class="skip" href="#main">{t['skip']}</a>

<header class="top">
  <div class="wrap">
    <a class="brand" href="{nl_href if k == 'nl' else en_href}">Valentijn de Grijff</a>
    <div class="top-right">
      <nav class="lang" aria-label="Language"><a href="{nl_href}" hreflang="nl" lang="nl"{nl_cur}>NL</a> · <a href="{en_href}" hreflang="en" lang="en"{en_cur}>EN</a></nav>
      <a class="btn btn-accent btn-small" href="{mailto}">{t['cta_small']}</a>
    </div>
  </div>
</header>

<main id="main">
  <section class="hero" aria-labelledby="hero-title">
    <div class="wrap">
      <div>
        <h1 id="hero-title">{t['h1']}</h1>
        <p class="lead">{e(t['lead'])}</p>
        <div class="actions">
          <a class="btn btn-accent" href="{mailto}">{t['btn']}</a>
          <a class="text-link" href="#work">{t['see']}</a>
        </div>
        <p class="fine">{e(t['fine'])}</p>
      </div>
      <div class="hero-phones" aria-hidden="true">
        <div class="phone back"><img src="{p}assets/pisa-ijs-phone.jpg" width="780" height="1688" alt="" fetchpriority="high"></div>
        <div class="phone front"><img src="{p}assets/tom-walsh-flooring-phone.jpg" width="780" height="1688" alt="" fetchpriority="high"></div>
      </div>
    </div>
  </section>

  <section class="section alt" aria-labelledby="st-title">
    <div class="wrap statement">
      <h2 id="st-title">{e(t['st_h'])}</h2>
      <p>{e(t['st_p'])}</p>
    </div>
  </section>

  <section class="section" id="work" aria-labelledby="work-title">
    <div class="wrap">
      <div class="work-head">
        <h2 id="work-title">{e(t['work_h'])}</h2>
        <p class="section-intro">{e(t['work_p'])}</p>
      </div>
      <div class="projects">
{chr(10).join(projects)}
      </div>
    </div>
  </section>

  <section class="section alt" aria-labelledby="steps-title">
    <div class="wrap">
      <h2 id="steps-title">{e(t['steps_h'])}</h2>
      <ol class="steps">
{steps}
      </ol>
    </div>
  </section>

  <section class="section" id="prices" aria-labelledby="prices-title">
    <div class="wrap prices-grid">
      <div>
        <h2 id="prices-title">{e(t['prices_h'])}</h2>
        <p class="section-intro">{e(t['prices_p'])}</p>
      </div>
      <ul class="price-list">
{prices}
      </ul>
    </div>
  </section>

  <section class="cta" id="contact" aria-labelledby="cta-title">
    <div class="wrap">
      <h2 id="cta-title">{e(t['cta_h'])}</h2>
      <p>{e(t['cta_p'])}</p>
      <a class="btn btn-light" href="{mailto}">{t['cta_btn']}</a><a class="mail" href="mailto:{MAIL}">{MAIL}</a>
    </div>
  </section>
</main>

<footer>
  <div class="wrap">
    <p>&copy; 2026 Valentijn de Grijff</p>
    <p>{e(t['note'])}</p>
  </div>
</footer>
</body>
</html>
'''


(ROOT / "assets" / "favicon.svg").write_text(FAVICON)
(ROOT / "index.html").write_text(page("nl"))
(ROOT / "en").mkdir(exist_ok=True)
(ROOT / "en" / "index.html").write_text(page("en"))
print("built")
