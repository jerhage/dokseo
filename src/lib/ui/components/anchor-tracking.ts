function followAnchor(place: () => void): () => void {
  window.addEventListener('scroll', place, { capture: true, passive: true });
  window.addEventListener('resize', place, { passive: true });
  return () => {
    window.removeEventListener('scroll', place, { capture: true });
    window.removeEventListener('resize', place);
  };
}

export { followAnchor };
