# Third-Party Notices

This document lists third-party data and assets distributed with **Wird**. The
project's MIT license applies only to material owned by the project. Items below
remain subject to their own terms and are not relicensed under MIT.

## Tanzil Quran Text

Files:

- `quran-data/quran-uthmani.xml`
- `quran-data/quran-data.xml`
- `resources/quran.db` (generated from the files above)

Attribution:

> Tanzil Quran Text (Uthmani, Version 1.1)
> Copyright (C) 2007-2026 Tanzil Project
> License: Creative Commons Attribution 3.0

The Quran text may be copied and distributed verbatim, but it must not be
changed. The Tanzil source must be clearly identified and linked. The complete
copyright and terms-of-use block is retained at the beginning of
`quran-data/quran-uthmani.xml`.

- Source: https://tanzil.net/
- License terms: https://tanzil.net/docs/Text_License
- License: https://creativecommons.org/licenses/by/3.0/

## QPC V2 Mushaf glyph layout

Files:

- `resources/mushaf-layout.db`

Sources:

- Quran.com API v4: https://api.quran.com/api/v4
- Developer terms: https://api-docs.quran.foundation/legal/developer-terms/

The glyph layout database is not licensed under this project's MIT license.
Quran Foundation content remains governed by its own developer terms. The
database is used only as the page-rendering layer; `resources/quran.db` remains
the source of truth for Quran text and application logic.

## QPC V2 Quran Fonts

Wird Desktop includes the QPC V2 page-by-page Quran fonts for rendering the
Madinah Mushaf.

- Files: `public/qpc-v2/p1.woff` through `public/qpc-v2/p604.woff`
- Resource name: QPC V2 Font
- Font model: Page-by-page glyph-based Quran font
- Number of page fonts: 604
- Original developer: King Fahd Complex for the Printing of the Holy Quran
- Calligraphy basis: Usman Taha
- Distribution source: Quranic Universal Library (QUL), developed by Tarteel
- Resource page: https://qul.tarteel.ai/resources/font/249
- QUL FAQ: https://qul.tarteel.ai/faq
- Format included in Wird Desktop: WOFF

These font files are third-party resources. They are not licensed under the Wird
Desktop source-code license, and the project does not claim ownership of them.
They are included solely for rendering Quran pages in the application. The QUL
resource page makes the font available for download and application use, but it
does not state an MIT, OFL, Apache, or other open-source software license for the
font files. See `LICENSE_SCOPE.md` and `public/qpc-v2/NOTICE.md`.

### إشعار خطوط QPC V2

يستخدم وِرد 604 خطوط منفصلة من QPC V2 لعرض صفحات مصحف المدينة. طوّر الخط مجمع
الملك فهد لطباعة المصحف الشريف اعتمادًا على خط عثمان طه، وتم الحصول عليه من
مكتبة القرآن الشاملة QUL المطوّرة من Tarteel. هذه الخطوط موارد طرف ثالث، ولا
يشملها ترخيص MIT الخاص بشيفرة وِرد، ولا يدّعي المشروع ملكيتها أو يعيد ترخيصها.

## Quran Recitation — Sheikh Saad Al-Ghamdi

Files:

- `public/sounds/app-open.mp3`
- `public/sounds/pre-session.mp3`
- `public/sounds/notification.mp3`
- `public/sounds/session-start.mp3`
- `public/sounds/session-completed.mp3`
- `public/sounds/close-app.mp3`

Wird Desktop includes selected Quran verse recordings recited by Sheikh Saad
Al-Ghamdi from the **EveryAyah — Ghamadi 40kbps** collection.

- Original collection: https://everyayah.com/recitations_ayat.html
- Included use: free Quranic reminders inside the application
- Folder notice: `public/sounds/NOTICE.md`

The recordings remain attributed to the reciter and their respective rights
holders. They are not licensed under the Wird Desktop source-code license, and
the project claims no ownership over them. Wird Desktop does not sell the
recordings, place them behind a paid subscription, or provide a separate Quran
audio download service.

### إشعار التلاوات القرآنية

يتضمن وِرد مقاطع مختارة من تلاوة القرآن الكريم بصوت الشيخ سعد الغامدي، من
مجموعة `Ghamadi_40kbps` المنشورة عبر EveryAyah. تبقى جميع حقوق التسجيلات
للقارئ وأصحاب الحقوق المعنيين، ولا يشملها ترخيص MIT الخاص بشيفرة وِرد، ولا
يدّعي المشروع ملكيتها. تُستخدم المقاطع كتذكيرات قرآنية مجانية داخل التطبيق فقط.

## Software dependencies

JavaScript dependencies retain the licenses declared by their respective
packages. Their exact versions are recorded in `package-lock.json`. Review the
license metadata of all production and build dependencies when preparing a
distributable binary.
