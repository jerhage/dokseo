import type { RecordedRun } from './subtree-runs';

const SPLIT_SQUASH_JOIN: RecordedRun = {
  label: 'git-subtree in Git 2.46.1, find_existing_splits: a squash commit only becomes a mapping',
  code: `END)
	debug "Main is: '$main'"
	if test -z "$main" && test -n "$sub"
	then
		# squash commits refer to a subtree
		debug "  Squash: $sq from $sub"
		cache_set "$sq" "$sub"
	fi
	if test -n "$main" && test -n "$sub"
	then
		debug "  Prior: $main -> $sub"
		cache_set $main $sub
		cache_set $sub $sub
		try_remove_previous "$main"
		try_remove_previous "$sub"
	fi`,
};

export { SPLIT_SQUASH_JOIN };
