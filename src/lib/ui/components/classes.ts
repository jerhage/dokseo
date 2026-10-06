import type { TagColour } from '../core/tag-colours.js';

type ButtonVariant =
  | 'default'
  | 'primary'
  | 'accent'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'ghost-danger';

type ControlSize = 'sm' | 'md' | 'lg';

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'accent';

type BadgeEmphasis = 'tinted' | 'solid' | 'quiet';

type StatusVariant = 'info' | 'success' | 'warning' | 'danger';

type CardVariant = 'default' | 'elevated' | 'feature';

type CardSize = 'sm' | 'md';

type TableSize = 'sm' | 'md';

type DropzoneSize = 'sm' | 'md';

type TabsVariant = 'underline' | 'pill';

type MediaRatio = 'video' | 'square' | 'portrait';

type ModalSize = 'sm' | 'md' | 'lg';

type ModalPlacement = 'center' | 'top';

type DrawerSide = 'end' | 'start' | 'bottom';

type ToastPlacement = 'bottom' | 'top';

type FieldLayout = 'stacked' | 'inline';

type RadioVariant = 'default' | 'tile';

type MenuAlign = 'start' | 'end';

type AvatarShape = 'circle' | 'square';

type AvatarVariant = 'primary' | 'accent';

type ProgressVariant = 'primary' | 'success' | 'warning' | 'danger' | 'accent';

type SkeletonShape = 'default' | 'text' | 'title' | 'circle' | 'block';

type StatTrend = 'flat' | 'up' | 'down';

type StatSize = 'sm' | 'md';

type ClassList = readonly string[];

const BUTTON_VARIANTS: Readonly<Record<ButtonVariant, ClassList>> = {
  default: [],
  primary: ['btn-primary'],
  accent: ['btn-accent'],
  outline: ['btn-outline', 'btn-primary'],
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
  primary: ['badge-primary'],
  accent: ['badge-accent'],
};

const BADGE_EMPHASES: Readonly<Record<BadgeEmphasis, ClassList>> = {
  tinted: [],
  solid: ['badge-solid'],
  quiet: ['badge-quiet'],
};

const BADGE_COLOUR_CLASSES: Readonly<Record<TagColour, ClassList>> = {
  slate: ['badge-color-slate'],
  clay: ['badge-color-clay'],
  sage: ['badge-color-sage'],
  plum: ['badge-color-plum'],
  rose: ['badge-color-rose'],
  ice: ['badge-color-ice'],
  ruby: ['badge-color-ruby'],
  copper: ['badge-color-copper'],
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

const TOAST_REGION_PLACEMENTS: Readonly<Record<ToastPlacement, ClassList>> = {
  bottom: [],
  top: ['toast-region-top'],
};

const FIELD_LAYOUTS: Readonly<Record<FieldLayout, ClassList>> = {
  stacked: [],
  inline: ['field-inline'],
};

const CARD_VARIANTS: Readonly<Record<CardVariant, ClassList>> = {
  default: [],
  elevated: ['card-elevated'],
  feature: ['card-feature'],
};

const CARD_SIZES: Readonly<Record<CardSize, ClassList>> = {
  sm: ['card-sm'],
  md: [],
};

const TABLE_SIZES: Readonly<Record<TableSize, ClassList>> = {
  sm: ['table-sm'],
  md: [],
};

const DROPZONE_SIZES: Readonly<Record<DropzoneSize, ClassList>> = {
  sm: ['dropzone-sm'],
  md: [],
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

const DRAWER_SIDES: Readonly<Record<DrawerSide, ClassList>> = {
  end: [],
  start: ['drawer-start'],
  bottom: ['drawer-bottom'],
};

const RADIO_VARIANTS: Readonly<Record<RadioVariant, ClassList>> = {
  default: [],
  tile: ['radio-tile'],
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
  primary: [],
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

const STAT_SIZES: Readonly<Record<StatSize, ClassList>> = {
  sm: ['stat-sm'],
  md: [],
};

const TAG_COLOUR_CLASSES: Readonly<Record<TagColour, ClassList>> = {
  slate: ['tag-color-slate'],
  clay: ['tag-color-clay'],
  sage: ['tag-color-sage'],
  plum: ['tag-color-plum'],
  rose: ['tag-color-rose'],
  ice: ['tag-color-ice'],
  ruby: ['tag-color-ruby'],
  copper: ['tag-color-copper'],
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
  BADGE_EMPHASES,
  BADGE_VARIANTS,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  CARD_SIZES,
  CARD_VARIANTS,
  DRAWER_SIDES,
  DROPZONE_SIZES,
  FIELD_LAYOUTS,
  MEDIA_RATIOS,
  MODAL_PLACEMENTS,
  MODAL_SIZES,
  PROGRESS_SIZES,
  PROGRESS_VARIANTS,
  RADIO_VARIANTS,
  SKELETON_SHAPES,
  STAT_SIZES,
  STAT_TRENDS,
  TABLE_SIZES,
  TABS_VARIANTS,
  TAG_COLOUR_CLASSES,
  TOAST_REGION_PLACEMENTS,
  TOAST_VARIANTS,
};
export type {
  AvatarShape,
  AvatarVariant,
  BadgeEmphasis,
  BadgeVariant,
  ButtonVariant,
  CardSize,
  CardVariant,
  ClassList,
  ControlSize,
  DrawerSide,
  DropzoneSize,
  FieldLayout,
  MediaRatio,
  MenuAlign,
  ModalPlacement,
  ModalSize,
  ProgressVariant,
  RadioVariant,
  SkeletonShape,
  StatSize,
  StatTrend,
  StatusVariant,
  TableSize,
  TabsVariant,
  ToastPlacement,
};
