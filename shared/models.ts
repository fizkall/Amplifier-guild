/**
 * Amplifier Guild — Firestore veri modelleri (frontend + Cloud Functions ortak).
 * Şema dokümanı: docs/FIRESTORE_SCHEMA.md
 *
 * Not: `Timestamp` tipi istemcide `firebase/firestore`, Functions'ta `firebase-admin/firestore`
 * paketinden gelir; burada yapısal bir tip olarak tanımlanır ki iki tarafta da kullanılabilsin.
 */

export interface Timestamp {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
}

/* ───────────────────────── Ortak ───────────────────────── */

export type Program =
  | 'FRC' | 'FTC' | 'FLL' | 'VEX' | 'TEKNOFEST' | 'TUBITAK' | 'WRO' | 'MUN' | 'OTHER';

export interface UserSnapshot {
  uid: string;
  displayName: string;
  handle: string;
  photoURL: string | null;
  badges?: string[];
}

export interface ProjectSnapshot {
  name: string;
  slug: string;
  logoUrl: string | null;
}

/* ───────────────────────── Kullanıcılar ───────────────────────── */

export interface ProgramEntry {
  program: Program;
  /** Eski kayıtlar: sayısal takım numarası. Yeni kayıtlar teamCode kullanır. */
  teamNumber?: number;
  /** Opsiyonel takım kodu: FRC (ör. 6232) veya VEX/RECF (ör. 1234A). */
  teamCode?: string;
  teamName?: string;
  seasons: number[];
  role?: string; // "Yazılım Kaptanı", "Mekanik", "Sponsorluk"...
}

export interface UserProfile {
  uid: string;
  handle: string;
  displayName: string;
  photoURL: string | null;
  headline: string;
  bio: string;
  accountType: 'student' | 'founder' | 'mentor';
  school: { name: string; city: string; gradYear: number } | null;
  skills: string[];
  skillSlugs: string[];
  interests: string[];
  programs: ProgramEntry[];
  links: Partial<Record<'github' | 'linkedin' | 'portfolio' | 'instagram', string>>;
  openToWork: boolean;
  availability: { hoursPerWeek: number; remote: boolean; city: string | null };
  /** 'hidden': hesap devre dışı. */
  visibility: 'public' | 'members' | 'hidden';
  visibilityBeforeDeactivate?: 'public' | 'members';
  /** Sadece Cloud Functions yazar. */
  stats: { followers: number; following: number; posts: number; projectsJoined: number };
  /** Sadece admin / Cloud Functions yazar. */
  badges: string[];
  onboardingComplete: boolean;
  /** Ayarlar → Hesabı devre dışı bırak. */
  deactivated?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserPrivate {
  email: string;
  phone: string | null;
  birthDate: string | null; // YYYY-MM-DD
  isMinor: boolean;
  guardianConsent: { name: string; email: string; consentedAt: Timestamp } | null;
  kvkkConsentAt: Timestamp;
  marketingConsent: boolean;
  cvFileUrl: string | null;
}

export type ExperienceType =
  | 'frc_season' | 'competition' | 'award' | 'project'
  | 'education' | 'volunteer' | 'guild_project';

export interface Experience {
  type: ExperienceType;
  title: string;
  organization: string;
  program: Program | null;
  startDate: string; // YYYY-MM
  endDate: string | null;
  description: string;
  skills: string[];
  /** true sadece Cloud Functions tarafından yazılır (Guild projesine kabul). */
  verified: boolean;
  source: { projectId: string; opportunityId: string } | null;
  order: number;
}

/* ───────────────────────── Projeler ───────────────────────── */

export type ProjectStatus = 'pending' | 'active' | 'paused' | 'archived' | 'rejected';

export type SocialKey = 'website' | 'instagram' | 'linkedin' | 'x' | 'youtube' | 'github' | 'tiktok';

/** Belge ID'si = slug (projects/{slug}). */
export interface Project {
  name: string;
  slug: string;
  tagline: string;
  /** Hakkında metni. */
  description: string;
  /** Küçültülmüş görsel (data URL) veya https adresi. */
  logoUrl: string | null;
  coverUrl: string | null;
  kind: 'guild_internal' | 'partner_startup' | 'community';
  ownerId: string;
  /** Projeyi yönetebilen kullanıcılar (sorgu + kural için members ile senkron). */
  managerIds: string[];
  status: ProjectStatus;
  tags: string[];
  links: Partial<Record<SocialKey, string>>;
  stats: { members: number; followers: number; posts: number; openOpportunities: number };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ProjectRole = 'owner' | 'admin' | 'member';

export interface ProjectMember {
  uid: string;
  role: ProjectRole;
  title: string;
  userSnapshot: Omit<UserSnapshot, 'uid' | 'badges'>;
  joinedAt: Timestamp;
  viaOpportunityId: string | null;
}

/* ───────────────────────── İlanlar & Başvurular ───────────────────────── */

export type OpportunityStatus = 'draft' | 'open' | 'closed' | 'filled';
export type RoleType = 'volunteer' | 'internship' | 'part_time' | 'project_based';

export type QuestionType = 'text' | 'textarea' | 'url' | 'select';

/** İlana özel başvuru formu alanı. */
export interface OpportunityQuestion {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  maxLength: number;
  /** Sadece 'select' için. */
  options?: string[];
}

export interface Opportunity {
  projectId: string;
  projectSnapshot: ProjectSnapshot;
  title: string;
  description: string;
  /** İlan görseli (data URL veya https). */
  coverUrl: string | null;
  /** İlgili bağlantılar (ör. proje dokümanı, tanıtım videosu). */
  links: { label: string; url: string }[];
  roleType: RoleType;
  commitment: { hoursPerWeek: number; durationWeeks: number | null };
  location: { remote: boolean; city: string | null };
  requiredSkills: string[];
  requiredSkillSlugs: string[];
  niceToHaveSkillSlugs: string[];
  questions: OpportunityQuestion[]; // ≤ 10
  slots: number;
  /** Sadece Cloud Functions. */
  filledCount: number;
  /** Sadece Cloud Functions. */
  applicationCount: number;
  status: OpportunityStatus;
  deadline: Timestamp | null;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ApplicationStatus =
  | 'submitted' | 'in_review' | 'shortlisted' | 'accepted' | 'rejected' | 'withdrawn';

/** Belge ID'si: `${opportunityId}_${applicantId}` */
export interface Application {
  opportunityId: string;
  projectId: string;
  applicantId: string;
  opportunitySnapshot: { title: string; roleType: RoleType };
  projectSnapshot: ProjectSnapshot;
  applicantSnapshot: {
    displayName: string;
    handle: string;
    photoURL: string | null;
    headline: string;
    skills: string[];
    programs: ProgramEntry[];
    school: UserProfile['school'];
  };
  answers: Record<string, string>;
  message: string;
  /** Sadece Cloud Functions (0-100). */
  matchScore: number | null;
  status: ApplicationStatus;
  /** Sadece Cloud Functions. */
  statusHistory: { status: ApplicationStatus; at: Timestamp; by: string }[];
  decidedBy: string | null;
  decidedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ApplicationInternalReview {
  notes: string;
  rating: 1 | 2 | 3 | 4 | 5 | null;
  updatedBy: string;
  updatedAt: Timestamp;
}

/* ───────────────────────── Akış ───────────────────────── */

export type PostType = 'text' | 'update' | 'announcement' | 'opportunity';

export interface PostMedia {
  url: string;
  type: 'image' | 'video';
  width: number;
  height: number;
  alt: string;
}

export interface Post {
  authorId: string;
  authorSnapshot: Omit<UserSnapshot, 'uid'>;
  projectId: string | null;
  projectSnapshot: ProjectSnapshot | null;
  type: PostType;
  text: string; // ≤ 500
  media: PostMedia[]; // ≤ 4
  link: { url: string; title: string; image: string | null } | null;
  opportunityRef: { projectId: string; opportunityId: string; title: string } | null;
  mentions: string[];
  tags: string[];
  parentId: string | null;
  rootId: string | null;
  /** Sayaçlar sadece Cloud Functions. */
  replyCount: number;
  likeCount: number;
  repostCount: number;
  status: 'published' | 'hidden' | 'removed';
  pinned: boolean;
  createdAt: Timestamp;
  editedAt: Timestamp | null;
}

/* ───────────────────────── Bildirim / Moderasyon ───────────────────────── */

export type NotificationType =
  | 'like' | 'reply' | 'follow' | 'mention'
  | 'application_status' | 'new_application' | 'project_approved';

export interface AppNotification {
  type: NotificationType;
  actorSnapshot: UserSnapshot | null;
  target: { kind: 'post' | 'user' | 'project' | 'application'; id: string; projectId?: string };
  text: string;
  read: boolean;
  createdAt: Timestamp;
}

export interface Report {
  reporterId: string;
  target: { kind: 'post' | 'user' | 'project'; path: string };
  reason: 'spam' | 'harassment' | 'inappropriate' | 'fake' | 'other';
  details: string;
  status: 'open' | 'resolved';
  createdAt: Timestamp;
}

/* ───────────────────────── Callable Function sözleşmeleri ───────────────────────── */

export interface ReviewApplicationRequest {
  projectId: string;
  applicationId: string;
  decision: 'shortlisted' | 'accepted' | 'rejected';
  /** Başvurana gösterilecek kısa mesaj (opsiyonel). */
  messageToApplicant?: string;
}

export interface ReviewProjectRequest {
  projectId: string;
  decision: 'active' | 'rejected' | 'paused';
  reason?: string;
}

export interface SetUserRoleRequest {
  uid: string;
  role: 'admin' | 'moderator' | null;
}
