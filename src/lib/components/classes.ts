type ButtonVariant =
  | 'default'
  | 'primary'
  | 'accent'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'ghost-danger';

type ControlSize = 'sm' | 'md' | 'lg';

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'accent';

type StatusVariant = 'info' | 'success' | 'warning' | 'danger';

type CardVariant = 'default' | 'elevated' | 'feature';

type TabsVariant = 'underline' | 'pill';

type MediaRatio = 'video' | 'square' | 'portrait';

type ModalSize = 'sm' | 'md' | 'lg';

type ModalPlacement = 'center' | 'top';

type ModalBody = 'padded' | 'flush';

type ModalFooter = 'actions' | 'info';

type MenuAlign = 'start' | 'end';

type AvatarShape = 'circle' | 'square';

type AvatarVariant = 'brand' | 'accent';

type ProgressVariant = 'primary' | 'success' | 'warning' | 'danger' | 'accent';

type SkeletonShape = 'default' | 'text' | 'title' | 'circle' | 'block';

type StatTrend = 'flat' | 'up' | 'down';

type TagColour =
  | 'slate'
  | 'clay'
  | 'sage'
  | 'plum'
  | 'rose'
  | 'ice'
  | 'ruby'
  | 'ember'
  | 'olive'
  | 'fern'
  | 'cyan'
  | 'sky'
  | 'indigo'
  | 'violet'
  | 'magenta'
  | 'stone';

type ClassList = readonly string[];

const BUTTON_VARIANTS: Readonly<Record<ButtonVariant, ClassList>> = {
  default: [],
  primary: ['btn-primary'],
  accent: ['btn-accent'],
  outline: ['btn-outline'],
  ghost: ['btn-ghost'],
  danger: ['btn-danger'],
  'ghost-danger': ['btn-ghost', 'btn-danger'],
};

const BUTTON_SIZES: Readonly<Record<ControlSize, ClassList>> = {
  sm: ['btn-sm'],
  md: [],
  lg: ['btn-lg'],
};

const BADGE_VARIANTS: Readonly<Record<BadgeVariant, ClassList>> = {
  neutral: ['badge-neutral'],
  success: ['badge-success'],
  warning: ['badge-warning'],
  danger: ['badge-danger'],
  info: ['badge-info'],
  brand: ['badge-brand'],
  accent: ['badge-accent'],
};

const BADGE_COLOUR_CLASSES: Readonly<Record<TagColour, ClassList>> = {
  slate: ['badge-color-slate'],
  clay: ['badge-color-clay'],
  sage: ['badge-color-sage'],
  plum: ['badge-color-plum'],
  rose: ['badge-color-rose'],
  ice: ['badge-color-ice'],
  ruby: ['badge-color-ruby'],
  ember: ['badge-color-ember'],
  olive: ['badge-color-olive'],
  fern: ['badge-color-fern'],
  cyan: ['badge-color-cyan'],
  sky: ['badge-color-sky'],
  indigo: ['badge-color-indigo'],
  violet: ['badge-color-violet'],
  magenta: ['badge-color-magenta'],
  stone: ['badge-color-stone'],
};

const ALERT_VARIANTS: Readonly<Record<StatusVariant, ClassList>> = {
  info: ['alert-info'],
  success: ['alert-success'],
  warning: ['alert-warning'],
  danger: ['alert-danger'],
};

const TOAST_VARIANTS: Readonly<Record<StatusVariant, ClassList>> = {
  info: ['toast-info'],
  success: ['toast-success'],
  warning: ['toast-warning'],
  danger: ['toast-danger'],
};

const CARD_VARIANTS: Readonly<Record<CardVariant, ClassList>> = {
  default: [],
  elevated: ['card-elevated'],
  feature: ['card-feature'],
};

const MEDIA_RATIOS: Readonly<Record<MediaRatio, ClassList>> = {
  video: [],
  square: ['aspect-square'],
  portrait: ['aspect-portrait'],
};

const TABS_VARIANTS: Readonly<Record<TabsVariant, ClassList>> = {
  underline: [],
  pill: ['tabs-pill'],
};

const MODAL_SIZES: Readonly<Record<ModalSize, ClassList>> = {
  sm: ['modal-sm'],
  md: [],
  lg: ['modal-lg'],
};

const MODAL_PLACEMENTS: Readonly<Record<ModalPlacement, ClassList>> = {
  center: [],
  top: ['modal-top'],
};

const MODAL_BODIES: Readonly<Record<ModalBody, ClassList>> = {
  padded: [],
  flush: ['modal-body-flush'],
};

const MODAL_FOOTERS: Readonly<Record<ModalFooter, ClassList>> = {
  actions: [],
  info: ['modal-footer-info'],
};

const MENU_ALIGNS: Readonly<Record<MenuAlign, ClassList>> = {
  start: [],
  end: ['dropdown-menu-end'],
};

const AVATAR_SIZES: Readonly<Record<ControlSize, ClassList>> = {
  sm: ['avatar-sm'],
  md: [],
  lg: ['avatar-lg'],
};

const AVATAR_SHAPES: Readonly<Record<AvatarShape, ClassList>> = {
  circle: [],
  square: ['avatar-square'],
};

const AVATAR_VARIANTS: Readonly<Record<AvatarVariant, ClassList>> = {
  brand: [],
  accent: ['avatar-accent'],
};

const PROGRESS_VARIANTS: Readonly<Record<ProgressVariant, ClassList>> = {
  primary: [],
  success: ['progress-success'],
  warning: ['progress-warning'],
  danger: ['progress-danger'],
  accent: ['progress-accent'],
};

const PROGRESS_SIZES: Readonly<Record<ControlSize, ClassList>> = {
  sm: ['progress-sm'],
  md: [],
  lg: ['progress-lg'],
};

const SKELETON_SHAPES: Readonly<Record<SkeletonShape, ClassList>> = {
  default: [],
  text: ['skeleton-text'],
  title: ['skeleton-title'],
  circle: ['skeleton-circle'],
  block: ['skeleton-block'],
};

const STAT_TRENDS: Readonly<Record<StatTrend, ClassList>> = {
  flat: [],
  up: ['stat-delta-up'],
  down: ['stat-delta-down'],
};

const TAG_COLOURS: readonly TagColour[] = [
  'slate',
  'clay',
  'sage',
  'plum',
  'rose',
  'ice',
  'ruby',
  'ember',
  'olive',
  'fern',
  'cyan',
  'sky',
  'indigo',
  'violet',
  'magenta',
  'stone',
];

const TAG_COLOUR_CLASSES: Readonly<Record<TagColour, ClassList>> = {
  slate: ['tag-color-slate'],
  clay: ['tag-color-clay'],
  sage: ['tag-color-sage'],
  plum: ['tag-color-plum'],
  rose: ['tag-color-rose'],
  ice: ['tag-color-ice'],
  ruby: ['tag-color-ruby'],
  ember: ['tag-color-ember'],
  olive: ['tag-color-olive'],
  fern: ['tag-color-fern'],
  cyan: ['tag-color-cyan'],
  sky: ['tag-color-sky'],
  indigo: ['tag-color-indigo'],
  violet: ['tag-color-violet'],
  magenta: ['tag-color-magenta'],
  stone: ['tag-color-stone'],
};

export {
  ALERT_VARIANTS,
  AVATAR_SHAPES,
  AVATAR_SIZES,
  AVATAR_VARIANTS,
  BADGE_COLOUR_CLASSES,
  BADGE_VARIANTS,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  CARD_VARIANTS,
  MEDIA_RATIOS,
  MENU_ALIGNS,
  MODAL_BODIES,
  MODAL_FOOTERS,
  MODAL_PLACEMENTS,
  MODAL_SIZES,
  PROGRESS_SIZES,
  PROGRESS_VARIANTS,
  SKELETON_SHAPES,
  STAT_TRENDS,
  TABS_VARIANTS,
  TAG_COLOUR_CLASSES,
  TAG_COLOURS,
  TOAST_VARIANTS,
};
export type {
  AvatarShape,
  AvatarVariant,
  BadgeVariant,
  ButtonVariant,
  CardVariant,
  ClassList,
  ControlSize,
  MediaRatio,
  MenuAlign,
  ModalBody,
  ModalFooter,
  ModalPlacement,
  ModalSize,
  ProgressVariant,
  SkeletonShape,
  StatTrend,
  StatusVariant,
  TabsVariant,
  TagColour,
};
