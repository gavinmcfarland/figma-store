import { atom, onSet, type WritableAtom } from "nanostores";
import { clientStorage } from "./clientStorageBridge";

type PersistOptions<T> = {
	key: string;
	initial?: T;
	encode?: (value: T) => any;
	decode?: (value: any) => T;
};

export function persist<T>(store: WritableAtom<T>, options: PersistOptions<T>) {
	const { key, initial, encode = (v) => v, decode = (v) => v } = options;

	const loading = atom<boolean>(true);

	// Load from storage
	clientStorage.getItem(key).then((raw) => {
		if (raw !== undefined) {
			store.set(decode(raw));
		} else if (initial !== undefined) {
			store.set(initial);
		}
		loading.set(false);
	});

	// Save to storage on change
	onSet(store, ({ newValue }) => {
		if (!loading.get()) {
			clientStorage.setItem(key, encode(newValue));
		}
	});

	return {
		store,
		loading,
	};
}
