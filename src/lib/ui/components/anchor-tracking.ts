function watchedSize(overlay: Element | undefined, place: () => void): ResizeObserver | undefined {
  if (overlay === undefined) return undefined;
  const observer = new ResizeObserver(place);
  observer.observe(overlay);
  return observer;
}

function followAnchor(place: () => void, overlay?: Element): () => void {
  window.addEventListener('scroll', place, { capture: true, passive: true });
  window.addEventListener('resize', place, { passive: true });
  const resizing = watchedSize(overlay, place);
  return () => {
    window.removeEventListener('scroll', place, { capture: true });
    window.removeEventListener('resize', place);
    resizing?.disconnect();
  };
}

export { followAnchor };
