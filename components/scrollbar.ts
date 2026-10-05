type Viewport = { readonly innerWidth: number };

type Root = { readonly clientWidth: number };

function showsScrollbar(viewport: Viewport, root: Root): boolean {
  return viewport.innerWidth > root.clientWidth;
}

export { showsScrollbar };
export type { Root, Viewport };
