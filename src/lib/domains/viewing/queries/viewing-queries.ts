import { mutationOptions } from '@tanstack/svelte-query';
import type { BookId } from '$lib/shared/ids';
import type { ReadingPlace } from '$lib/shared/reading-place';

type BookEditing<E, R> = {
  readonly editBook: (id: BookId, edit: E) => Promise<R>;
};

type PlaceSaving<R> = {
  readonly saveReadingPlace: (id: BookId, place: ReadingPlace) => Promise<R>;
};

type BookEditRequest<E> = { readonly id: BookId; readonly edit: E };

type PlaceRequest = { readonly id: BookId; readonly place: ReadingPlace };

function editBookMutation<E, R>(library: BookEditing<E, R>) {
  return mutationOptions({
    mutationFn: ({ id, edit }: BookEditRequest<E>) => library.editBook(id, edit),
  });
}

function saveReadingPlaceMutation<R>(library: PlaceSaving<R>) {
  return mutationOptions({
    mutationFn: ({ id, place }: PlaceRequest) => library.saveReadingPlace(id, place),
  });
}

export { editBookMutation, saveReadingPlaceMutation };
export type { BookEditRequest, BookEditing, PlaceRequest, PlaceSaving };
