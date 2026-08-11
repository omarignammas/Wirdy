import type { Language } from './locales'

type LegalSection = {
  title: string
  body: string
}

type LegalDocument = {
  title: string
  effectiveDate: string
  summary: string
  sections: readonly LegalSection[]
  contact: string
}

export type LegalDocumentKey = 'privacy' | 'terms'

export const legalDocuments: Record<Language, Record<LegalDocumentKey, LegalDocument>> = {
  en: {
    privacy: {
      title: 'Privacy Policy',
      effectiveDate: 'Effective August 11, 2026',
      summary: 'Wirdy is local-first. The current app does not send your profile, reading history, Khatamat, or backups to a Wirdy-operated server.',
      sections: [
        {
          title: 'Data stored on your device',
          body: 'Your name, email, salted password hash, reading plan, sessions, progress, bookmarks, settings, statistics, and local Khatma records are stored in the app sandbox. Credentials use the iOS Keychain or Android Keystore through Expo SecureStore.',
        },
        {
          title: 'How the data is used',
          body: 'The app uses local data to sign you in on this device, resume reading, calculate progress, manage sessions and Khatamat, remember settings, and create reminders you enable.',
        },
        {
          title: 'Backups and sharing',
          body: 'Backups are created only when you request them. They contain reading data but not your password credentials. Once exported through the system share sheet, the file is controlled by the destination you choose and should be treated as sensitive.',
        },
        {
          title: 'Collection and disclosure',
          body: 'Wirdy currently includes no advertising, analytics, tracking SDK, cloud account, or remote synchronization service. The project maintainers do not receive or sell your app data. Device, App Store, Expo Go, file, and notification services are governed by their providers when you use them.',
        },
        {
          title: 'Retention and deletion',
          body: 'Local data remains until you clear the app data or remove the app from your device. Exported backups must be deleted separately from every location where you saved or shared them. There is no remote Wirdy account or server copy to delete.',
        },
      ],
      contact: 'For privacy questions, contact the repository owner on GitHub. Do not include passwords, backup files, or other sensitive data in a public issue.',
    },
    terms: {
      title: 'Terms of Use',
      effectiveDate: 'Effective August 11, 2026',
      summary: 'By using Wirdy, you agree to use the app responsibly and understand that it is a local reading companion provided without a cloud service or guarantee of uninterrupted availability.',
      sections: [
        {
          title: 'Local service',
          body: 'Profiles, plans, progress, sessions, and Khatamat are local to your device. Invite codes and group records do not synchronize across devices unless a hosted service is added in a future version.',
        },
        {
          title: 'Your responsibilities',
          body: 'Keep your device and exported backups secure, verify reminders and schedules, and maintain a backup when the data matters to you. Do not use the app or source code for unlawful, harmful, deceptive, or infringing activity.',
        },
        {
          title: 'Quran and Tafsir content',
          body: 'Bundled Quran, Mushaf, and Tafsir resources remain subject to their original rights and notices. The app is a reading aid and is not a substitute for qualified religious guidance. Please report suspected content errors before relying on or redistributing the affected material.',
        },
        {
          title: 'Open-source software',
          body: 'Project-owned source code is licensed under MIT. Wirdy is adapted from the open-source Wird project by abu-ayesh. Third-party data, assets, libraries, and platform services retain their own terms and licenses.',
        },
        {
          title: 'Availability and liability',
          body: 'The app is provided “as is” and “as available” without warranties to the extent permitted by law. The maintainers are not responsible for missed reminders, lost local data, backup disclosure, or indirect losses arising from use of the app.',
        },
      ],
      contact: 'Questions about these terms may be directed to the Wirdy repository owner on GitHub.',
    },
  },
  ar: {
    privacy: {
      title: 'سياسة الخصوصية',
      effectiveDate: 'تاريخ السريان: 11 أغسطس 2026',
      summary: 'وِرد تطبيق محلي أولًا. لا يرسل الإصدار الحالي ملفك الشخصي أو سجل القراءة أو الختمات أو النسخ الاحتياطية إلى خادم تديره وِرد.',
      sections: [
        {
          title: 'البيانات المحفوظة على جهازك',
          body: 'يُحفظ الاسم والبريد الإلكتروني وملخص كلمة المرور المملح وخطة القراءة والجلسات والتقدم والعلامات والإعدادات والإحصائيات وبيانات الختمات المحلية داخل مساحة التطبيق. تُحفظ بيانات الدخول عبر Keychain في iOS أو Keystore في Android باستخدام Expo SecureStore.',
        },
        {
          title: 'كيفية استخدام البيانات',
          body: 'يستخدم التطبيق البيانات المحلية لتسجيل الدخول على هذا الجهاز، واستئناف القراءة، وحساب التقدم، وإدارة الجلسات والختمات، وتذكر الإعدادات، وإنشاء التذكيرات التي تختار تفعيلها.',
        },
        {
          title: 'النسخ الاحتياطي والمشاركة',
          body: 'لا تُنشأ النسخة الاحتياطية إلا بطلبك. تتضمن بيانات القراءة ولا تتضمن بيانات كلمة المرور. بعد تصدير الملف عبر نافذة المشاركة في النظام، يصبح خاضعًا للوجهة التي تختارها ويجب التعامل معه كملف حساس.',
        },
        {
          title: 'الجمع والإفصاح',
          body: 'لا يتضمن وِرد حاليًا إعلانات أو تحليلات أو أدوات تتبع أو حسابًا سحابيًا أو مزامنة عن بعد. لا يستلم القائمون على المشروع بيانات التطبيق ولا يبيعونها. تخضع خدمات الجهاز والمتجر وExpo Go والملفات والإشعارات لسياسات مزوديها عند استخدامها.',
        },
        {
          title: 'الاحتفاظ والحذف',
          body: 'تبقى البيانات المحلية حتى تمسح بيانات التطبيق أو تحذف التطبيق من جهازك. يجب حذف النسخ المصدّرة بصورة مستقلة من كل مكان حفظتها أو شاركتها فيه. لا يوجد حساب بعيد أو نسخة على خادم وِرد لحذفها.',
        },
      ],
      contact: 'لأسئلة الخصوصية، تواصل مع مالك المستودع على GitHub. لا ترسل كلمات المرور أو ملفات النسخ الاحتياطي أو بيانات حساسة في بلاغ عام.',
    },
    terms: {
      title: 'شروط الاستخدام',
      effectiveDate: 'تاريخ السريان: 11 أغسطس 2026',
      summary: 'باستخدام وِرد، فإنك توافق على استعمال التطبيق بمسؤولية وتفهم أنه رفيق قراءة محلي يُقدَّم دون خدمة سحابية أو ضمان للتوفر المستمر.',
      sections: [
        {
          title: 'الخدمة المحلية',
          body: 'الملفات الشخصية والخطط والتقدم والجلسات والختمات محلية على جهازك. لا تتزامن رموز الدعوة وبيانات المجموعات بين الأجهزة ما لم تُضف خدمة مستضافة في إصدار لاحق.',
        },
        {
          title: 'مسؤولياتك',
          body: 'حافظ على أمان جهازك ونسخك المصدّرة، وتحقق من التذكيرات والمواعيد، واحتفظ بنسخة احتياطية عندما تهمك البيانات. لا تستخدم التطبيق أو الشيفرة في نشاط غير قانوني أو ضار أو مضلل أو منتهك للحقوق.',
        },
        {
          title: 'محتوى القرآن والتفسير',
          body: 'تبقى موارد القرآن والمصحف والتفسير المرفقة خاضعة لحقوقها وإشعاراتها الأصلية. التطبيق أداة مساعدة للقراءة وليس بديلًا عن الرجوع إلى أهل العلم. يرجى الإبلاغ عن أي خطأ محتمل قبل الاعتماد على المادة المتأثرة أو إعادة توزيعها.',
        },
        {
          title: 'البرمجيات مفتوحة المصدر',
          body: 'تخضع الشيفرة التي يملكها المشروع لترخيص MIT. وِرد مقتبس من مشروع Wird مفتوح المصدر لصاحبه abu-ayesh. تحتفظ بيانات وأصول ومكتبات وخدمات الأطراف الأخرى بشروطها وتراخيصها الخاصة.',
        },
        {
          title: 'التوفر وحدود المسؤولية',
          body: 'يُقدَّم التطبيق «كما هو» و«حسب التوفر» دون ضمانات في الحدود التي يسمح بها القانون. لا يتحمل القائمون على المشروع مسؤولية التذكيرات الفائتة أو فقدان البيانات المحلية أو كشف النسخ الاحتياطية أو الخسائر غير المباشرة الناتجة عن الاستخدام.',
        },
      ],
      contact: 'يمكن توجيه الأسئلة المتعلقة بهذه الشروط إلى مالك مستودع وِرد على GitHub.',
    },
  },
}
