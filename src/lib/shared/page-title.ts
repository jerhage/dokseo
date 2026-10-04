const APP_NAME = 'Dokseo';

const TITLE_SEPARATOR = ' · ';

function pageTitle(screen: string, section: string | null = null): string {
  const named = section === null ? screen : `${screen}: ${section}`;
  return `${named}${TITLE_SEPARATOR}${APP_NAME}`;
}

export { pageTitle };
