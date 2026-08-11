# Third-Party Notices

This document identifies upstream code and third-party data distributed with
**Wirdy**. The root MIT license covers only material owned by the project. The
items below retain their original copyright, attribution, license, and usage
terms.

## Upstream Wird Project

Wirdy is a mobile adaptation built from and inspired by:

- Project: **Wird**
- Repository: https://github.com/abu-ayesh/wird-project
- License: MIT
- Copyright notice: Copyright (c) 2026 Mohammad Zhour

The upstream MIT copyright and permission notice is preserved in the root
[LICENSE](LICENSE) file. Modifications and mobile-specific additions are
described in the [README](README.md). Nothing in this notice changes the rights
granted by the upstream MIT license.

## Tanzil Quran Text

Bundled file:

- `assets/databases/quran.db`

The upstream Wird project documents this database as generated from Tanzil's
Uthmani Quran text and metadata.

Attribution:

> Tanzil Quran Text (Uthmani, Version 1.1)
>
> Copyright (C) 2007-2026 Tanzil Project
>
> License: Creative Commons Attribution 3.0

The Quran text must not be changed. Tanzil must be identified as the source
when the text is copied or distributed.

- Source: https://tanzil.net/
- Text license: https://tanzil.net/docs/Text_License
- CC BY 3.0: https://creativecommons.org/licenses/by/3.0/

The Quran database is not relicensed under Wirdy's MIT license.

## Mushaf Layout Data

Bundled file:

- `assets/databases/mushaf-layout.db`

The upstream source identifies the Mushaf glyph layout as originating from the
Quran.com API v4 / Quran Foundation developer platform.

- API: https://api.quran.com/api/v4
- Developer terms: https://api-docs.quran.foundation/legal/developer-terms/

Quran Foundation content remains governed by its own terms. The layout database
is used as a rendering layer and is not relicensed under Wirdy's MIT license.

## Tafsir Databases

Bundled files:

- `assets/tafsir/ar-tafseer-al-qurtubi.db`
- `assets/tafsir/ar-tafseer-al-saddi.db`
- `assets/tafsir/ar-tafsir-al-tabari.db`
- `assets/tafsir/ar-tafsir-ibn-kathir.db`
- `assets/tafsir/ar-tafsir-muyassar.db`

These databases were carried over from the upstream Wird source set. The texts
and database contents remain attributed to their respective authors, editors,
publishers, source projects, and rights holders. They are not relicensed under
Wirdy's MIT license.

The upstream repository does not include a specific open-source license for
each bundled Tafsir database. Anyone preparing a public or commercial binary
must verify the provenance and redistribution terms for each database before
distribution.

## Software Dependencies

JavaScript, Expo, React Native, and native dependencies retain the licenses
declared by their respective packages. Exact versions are recorded in
`package-lock.json`. Review production and transitive dependency licenses when
preparing a distributable binary.

## إشعارات الأطراف الأخرى

وِرد نسخة هاتف مقتبسة ومستوحاة من
[مشروع Wird مفتوح المصدر](https://github.com/abu-ayesh/wird-project) المرخص
بترخيص MIT، وقد تم الاحتفاظ بإشعار حقوق النشر والترخيص في ملف `LICENSE`.

لا يشمل ترخيص MIT الخاص بالشيفرة ملكية قاعدة نص القرآن من Tanzil، أو بيانات
تخطيط المصحف من منصة Quran Foundation، أو قواعد التفاسير المرفقة. تبقى هذه
الموارد خاضعة لحقوق وشروط مصادرها الأصلية. يجب التحقق من مصدر وترخيص كل قاعدة
تفسير قبل نشر نسخة عامة أو تجارية من التطبيق.
