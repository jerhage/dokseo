<script lang="ts">
	import type { Book } from '../domain/book';

	type Props = { readonly book: Book; readonly cover: string | null };

	let { book, cover }: Props = $props();

	const total = $derived(Math.max(book.imageCount, 1));
	const page = $derived(Math.min(book.position + 1, total));
	const resume = $derived(`p.${String(page).padStart(3, '0')} / ${book.imageCount}`);
	const progress = $derived((page / total) * 100);
</script>

<article class="card">
	<div class="cover">
		{#if cover !== null}
			<img class="art" src={cover} alt="" />
		{/if}
		<p class="resume">
			<span class="dot" aria-hidden="true"></span>
			{resume}
		</p>
		<div class="track">
			<span class="bar" style:width="{progress}%"></span>
		</div>
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
