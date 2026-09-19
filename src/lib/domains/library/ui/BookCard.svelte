<script lang="ts">
	import { tick } from 'svelte';
	import type { BookId } from '$lib/shared/ids';
	import type { Book } from '../domain/book';

	type Props = {
		readonly book: Book;
		readonly cover: string | null;
		readonly onremove: (id: BookId) => void;
		readonly removing: boolean;
	};

	let { book, cover, onremove, removing }: Props = $props();

	let confirming = $state(false);
	let trigger = $state<HTMLButtonElement | null>(null);

	const total = $derived(Math.max(book.imageCount, 1));
	const page = $derived(Math.min(book.position + 1, total));
	const resume = $derived(`p.${String(page).padStart(3, '0')} / ${book.imageCount}`);
	const progress = $derived((page / total) * 100);

	async function cancel(): Promise<void> {
		confirming = false;
		await tick();
		trigger?.focus();
	}
</script>

<article class="card" class:busy={removing} aria-busy={removing}>
	<div class="cover">
		{#if cover !== null}
			<img class="art" src={cover} alt="" />
		{/if}

		{#if !confirming}
			<button
				bind:this={trigger}
				class="remove"
				type="button"
				disabled={removing}
				onclick={() => (confirming = true)}
			>
				<span class="glyph" aria-hidden="true">×</span>
				<span class="assistive">Remove {book.title}</span>
			</button>
		{/if}

		<p class="resume">
			<span class="dot" aria-hidden="true"></span>
			{resume}
		</p>
		<div class="track">
			<span class="bar" style:width="{progress}%"></span>
		</div>

		{#if confirming}
			<div class="confirm">
				<p class="ask">Remove this upload?</p>
				<div class="choices">
					<button
						class="discard"
						type="button"
						disabled={removing}
						onclick={() => onremove(book.id)}
					>
						{removing ? 'Removing…' : 'Remove'}
					</button>
					<button class="keep" type="button" disabled={removing} onclick={() => void cancel()}>
						Cancel
					</button>
				</div>
			</div>
		{/if}
	</div>
	<h3 class="title" class:ko={book.language === 'ko'} lang={book.language}>{book.title}</h3>
	<p class="count">{book.imageCount} images</p>
</article>

<style>
	.card {
		display: flex;
		flex-direction: column;
		gap: var(--s-2);
		min-width: 0;
	}

	.card.busy {
		opacity: 0.55;
	}

	.cover {
		position: relative;
		aspect-ratio: 2 / 3;
		overflow: hidden;
		border: 1px solid var(--c-border-7);
		border-radius: var(--r-md);
		background: repeating-linear-gradient(
			135deg,
			var(--c-surface-card-active) 0 7px,
			var(--c-border-6) 7px 14px
		);
	}

	.art {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.remove {
		position: absolute;
		top: var(--s-2);
		right: var(--s-2);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		padding: 0;
		border: 1px solid var(--c-border-4);
		border-radius: var(--r-pill);
		background: var(--c-surface-void);
		color: var(--c-text-4);
		font-family: var(--f-ui);
		font-size: 13px;
		line-height: 1;
		cursor: pointer;
		transition: opacity 120ms ease;
	}

	@media (hover: hover) {
		.remove {
			opacity: 0;
		}

		.card:hover .remove,
		.remove:focus-visible,
		.remove:disabled {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.remove {
			transition: none;
		}
	}

	.remove:hover:not(:disabled),
	.remove:focus-visible {
		border-color: var(--c-warning);
		color: var(--c-warning);
	}

	.remove:disabled {
		cursor: progress;
	}

	.glyph {
		display: block;
	}

	.assistive {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	.confirm {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--s-3);
		padding: var(--s-3);
		background: var(--c-surface-void);
		text-align: center;
	}

	.ask {
		margin: 0;
		color: var(--c-text-3);
		font-family: var(--f-ui);
		font-size: 11.5px;
	}

	.choices {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--s-2);
	}

	.discard,
	.keep {
		padding: var(--s-1) var(--s-2);
		border-radius: var(--r-sm);
		font-family: var(--f-ui);
		font-size: 11.5px;
		cursor: pointer;
	}

	.discard {
		border: 1px solid var(--c-warning);
		background: var(--c-warning);
		color: var(--c-surface-void);
		font-weight: 600;
	}

	.keep {
		border: 1px solid var(--c-border-4);
		background: var(--c-surface-button);
		color: var(--c-text-5);
	}

	.discard:disabled,
	.keep:disabled {
		cursor: progress;
		opacity: 0.6;
	}

	.resume {
		position: absolute;
		right: 0;
		bottom: 0;
		left: 0;
		display: flex;
		align-items: center;
		gap: var(--s-1);
		margin: 0;
		padding: var(--s-2) var(--s-2) var(--s-3);
		background: linear-gradient(to top, var(--c-surface-void), transparent);
		color: var(--c-text-5);
		font-family: var(--f-mono);
		font-size: 10px;
	}

	.dot {
		display: block;
		width: 5px;
		height: 5px;
		border-radius: var(--r-pill);
		background: var(--c-accent);
	}

	.track {
		position: absolute;
		right: 0;
		bottom: 0;
		left: 0;
		height: 3px;
		background: var(--c-border-1);
	}

	.bar {
		display: block;
		height: 100%;
		background: var(--c-accent);
	}

	.title {
		margin: 0;
		overflow: hidden;
		color: var(--c-text-2);
		font-family: var(--f-ja);
		font-size: 13px;
		font-weight: 400;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.title.ko {
		font-family: var(--f-ko);
	}

	.count {
		margin: 0;
		color: var(--c-text-8);
		font-family: var(--f-ui);
		font-size: 11px;
	}
</style>
