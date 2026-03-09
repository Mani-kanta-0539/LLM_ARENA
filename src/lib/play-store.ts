/**
 * In-memory store for large blobs (base64 images) that can't fit in sessionStorage.
 * Lives in module scope — survives same-tab client-side navigation but clears on refresh.
 */
interface PlayImages {
    char1Image?: string;
    char2Image?: string;
    backgroundImage?: string;
}

let _images: PlayImages = {};

export const playImageStore = {
    set(images: PlayImages) {
        _images = { ...images };
    },
    get(): PlayImages {
        return _images;
    },
    clear() {
        _images = {};
    },
};
