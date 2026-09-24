import { match } from 'ts-pattern';
import type { StatusVariant } from './classes';

type AnnouncementRole = 'alert' | 'status';

function announcementRole(variant: StatusVariant): AnnouncementRole {
  return match(variant)
    .returnType<AnnouncementRole>()
    .with('danger', () => 'alert')
    .with('info', 'success', 'warning', () => 'status')
    .exhaustive();
}

export { announcementRole };
export type { AnnouncementRole };
