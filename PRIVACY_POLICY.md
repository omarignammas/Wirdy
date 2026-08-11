# Privacy Policy

**Effective date:** August 11, 2026

**Last updated:** August 11, 2026

This Privacy Policy explains how the current version of **Wirdy** handles
information. It applies to the Wirdy mobile application and its virtual iPhone
preview. It does not govern the upstream Wird project or services operated by
Apple, Google, Expo, GitHub, or other third parties.

## Summary

Wirdy is a local-first application. The current app has no Wirdy-operated API,
cloud account, analytics service, advertising network, or cross-device sync
service. The project maintainers do not receive or sell your in-app data.

Your information stays on your device unless you deliberately export or share
a backup, use an operating-system sharing feature, or use the app through a
third-party development or distribution environment such as Expo Go.

## Information Processed on Your Device

Wirdy processes the following information locally to provide its features:

- **Local profile:** display name, email address, account identifier, account
  creation date, password salt, and password hash.
- **Reading activity:** plans, scheduled and completed sessions, reading time,
  current Surah, Ayah and page, bookmarks, streaks, goals, and statistics.
- **Khatma activity:** local groups, invite codes, members, roles, schedules,
  completed Juz records, and progress.
- **Preferences:** language, appearance, reader settings, Tafsir selection,
  reminder preferences, and other app settings.
- **Files you choose:** a Wirdy backup file selected for restoration or a
  destination selected for an exported backup.

The local profile is stored through Expo SecureStore, which uses the iOS
Keychain or Android Keystore. Passwords are salted and hashed before storage;
Wirdy does not store the original password. Reading and Khatma data are stored
in the app's local SQLite database. Some interface preferences may also be
stored in local application storage.

## How Information Is Used

The app uses this locally stored information to:

- authenticate a profile on the current device;
- resume reading from the saved position;
- schedule and manage reading sessions;
- calculate progress, goals, and statistics;
- create and manage local Khatma groups;
- remember language, reader, and notification preferences; and
- create or restore a backup when you request it.

Wirdy does not use this information for advertising, profiling, or sale.

## Notifications and Device Services

Wirdy includes support for local reading-reminder preferences. If notification
delivery is enabled in a distributed build, the operating system may ask for
permission and process the schedule needed to deliver local notifications.
Wirdy does not currently use push-notification tokens or a remote notification
server.

The app may invoke system components such as the document picker, file storage,
and share sheet. Those components and any destination you choose are governed
by the privacy terms of the operating-system provider or destination service.

## Backups

Backups are created only after a user action. A backup contains reading plans,
sessions, progress, Khatamat, settings, and related app state. It does **not**
contain the SecureStore profile or password hash.

Wirdy does not upload backups. After export, the file is controlled by the
storage location, app, person, or service you choose. Backup files are not
encrypted by Wirdy after export and should be treated as sensitive.

Restoring a backup replaces the corresponding local reading data. Review the
source and contents of a backup before restoring it.

## Sharing and Disclosure

The current app does not transmit app data to the Wirdy project maintainers,
data brokers, analytics providers, or advertisers. The maintainers do not sell
personal information.

Information can leave the app only through an action or environment you choose,
including exporting a backup, sharing through the system share sheet, selecting
a file from a third-party storage provider, or running the app through a
third-party development platform. Those providers are responsible for their own
data practices.

## Retention and Deletion

Local data remains on the device until it is cleared through the device's app
storage controls or the app is removed. Platform backups or device transfers
may retain app data according to your operating-system and cloud-backup
settings.

Because the current version has no remote Wirdy account or server database,
there is no server-side account record to close. To delete Wirdy data:

1. Remove the app and its data using the device's application settings.
2. Delete exported backup files separately from every location where they were
   saved or shared.
3. Review device or cloud backups if you do not want the operating system to
   preserve a copy.

The maintainers cannot retrieve or delete local data they never receive.

## Security

Wirdy uses platform secure storage for local credentials and an application
sandbox for its databases. No storage method can guarantee absolute security.
Keep the device locked, use a strong local password, install trusted builds,
and protect exported backup files.

## Children's Privacy

Wirdy is not designed to collect information from children through a remote
service. Because the current version does not send profile or reading data to
the maintainers, the maintainers do not knowingly receive children's personal
information through the app. A parent or guardian should supervise a child's
device, exported backups, and use of third-party services.

## Changes to This Policy

This policy may be updated when the app's features or data practices change.
The effective date above and the repository history identify the current
version. A release that adds a hosted account, synchronization, analytics, or
other remote processing must update this policy before that processing begins.

## Contact

For privacy questions, contact the repository owner through the
[Wirdy GitHub repository](https://github.com/omarignammas/Wirdy). For a
non-sensitive question, you may use
[GitHub Issues](https://github.com/omarignammas/Wirdy/issues). Do not include a
password, backup file, email address, or other sensitive information in a public
issue.

---

# سياسة الخصوصية

**تاريخ السريان:** 11 أغسطس 2026

**آخر تحديث:** 11 أغسطس 2026

توضح هذه السياسة كيفية تعامل الإصدار الحالي من تطبيق **وِرد** مع المعلومات.
تنطبق على تطبيق الهاتف ومحاكي iPhone الافتراضي، ولا تنطبق على مشروع Wird الأصلي
أو الخدمات التي تديرها Apple أو Google أو Expo أو GitHub أو غيرها.

## الخلاصة

وِرد تطبيق محلي أولًا. لا يتضمن الإصدار الحالي واجهة خادم تديرها وِرد، أو حسابًا
سحابيًا، أو تحليلات، أو إعلانات، أو مزامنة بين الأجهزة. لا يستلم القائمون على
المشروع بياناتك داخل التطبيق ولا يبيعونها.

تبقى معلوماتك على جهازك ما لم تصدّر نسخة احتياطية أو تشاركها بنفسك، أو تستخدم
إحدى أدوات المشاركة في النظام، أو تشغّل التطبيق عبر بيئة تطوير أو توزيع خارجية
مثل Expo Go.

## المعلومات المعالجة على جهازك

يعالج وِرد محليًا البيانات الآتية لتشغيل خصائصه:

- الملف المحلي: الاسم والبريد الإلكتروني ومعرف الحساب وتاريخ الإنشاء وملح كلمة
  المرور وملخصها المشفّر.
- نشاط القراءة: الخطة والجلسات ومدة القراءة والموضع والعلامات والأهداف
  والإحصائيات.
- نشاط الختمات: المجموعات المحلية ورموز الدعوة والأعضاء والأدوار والجداول
  والأجزاء المكتملة.
- التفضيلات: اللغة والمظهر وإعدادات القارئ والتفسير والتذكيرات.
- الملفات التي تختارها للاستعادة أو الوجهة التي تختارها لحفظ نسخة مصدّرة.

يُحفظ الملف المحلي عبر Expo SecureStore باستخدام Keychain في iOS أو Keystore
في Android. لا تُحفظ كلمة المرور الأصلية، بل ملخص مملح لها. وتُحفظ بيانات القراءة
والختمات في قاعدة SQLite المحلية داخل مساحة التطبيق.

## الاستخدام والمشاركة

تُستخدم البيانات محليًا لتسجيل الدخول على الجهاز، واستئناف القراءة، وإدارة
الجلسات والختمات، وحساب التقدم، وتذكر الإعدادات، وإنشاء نسخة احتياطية أو
استعادتها بطلبك. لا تُستخدم للإعلانات أو البيع أو إنشاء ملفات تسويقية.

قد يستدعي التطبيق أدوات النظام مثل منتقي الملفات ونافذة المشاركة والإشعارات.
وتخضع هذه الأدوات والوجهة التي تختارها لسياسات مزود النظام أو الخدمة المختارة.
لا يستخدم الإصدار الحالي رموز إشعارات دفع أو خادم إشعارات بعيدًا.

## النسخ الاحتياطي

لا تُنشأ النسخة إلا بطلب المستخدم. تشمل بيانات القراءة والخطة والجلسات والختمات
والإعدادات، ولا تشمل ملف SecureStore أو ملخص كلمة المرور. لا يرفع وِرد النسخة
إلى خادم. وبعد التصدير تصبح تحت سيطرة المكان أو التطبيق أو الشخص الذي تختاره،
ولا يشفرها وِرد بعد التصدير، لذلك يجب معاملتها كملف حساس.

## الاحتفاظ والحذف

تبقى البيانات على الجهاز حتى تمسح بيانات التطبيق من إعدادات الجهاز أو تحذف
التطبيق. قد تحتفظ نسخ النظام الاحتياطية بالبيانات وفق إعدادات جهازك. لا يوجد في
الإصدار الحالي حساب بعيد أو سجل على خادم وِرد لحذفه.

لحذف البيانات، احذف التطبيق وبياناته من إعدادات الجهاز، ثم احذف ملفات النسخ
المصدّرة من جميع الأماكن التي حفظتها أو شاركتها فيها، وراجع إعدادات النسخ
السحابي في نظام التشغيل. لا يستطيع القائمون على المشروع استرجاع أو حذف بيانات
محلية لم تصل إليهم أصلًا.

## الأمان والأطفال

يستخدم وِرد التخزين الآمن للنظام ومساحة التطبيق المعزولة، لكن لا توجد وسيلة
تخزين تضمن أمانًا مطلقًا. احم جهازك وملفات النسخ الاحتياطي وثبّت نسخًا موثوقة.
لا صُمم وِرد لجمع بيانات الأطفال عبر خدمة بعيدة، وينبغي لولي الأمر الإشراف على
جهاز الطفل وملفاته واستخدامه للخدمات الخارجية.

## التعديلات والتواصل

قد تتغير هذه السياسة عند تغير الخصائص أو ممارسات البيانات. يبين تاريخ السريان
وسجل المستودع النسخة الحالية. يجب تحديث السياسة قبل إضافة حساب مستضاف أو
مزامنة أو تحليلات أو معالجة بعيدة.

للأسئلة، تواصل مع مالك
[مستودع وِرد على GitHub](https://github.com/omarignammas/Wirdy). ويمكن استخدام
[GitHub Issues](https://github.com/omarignammas/Wirdy/issues) للأسئلة غير
الحساسة. لا تنشر كلمة مرور أو ملف نسخة احتياطية أو بريدًا إلكترونيًا أو أي
معلومات حساسة في بلاغ عام.
