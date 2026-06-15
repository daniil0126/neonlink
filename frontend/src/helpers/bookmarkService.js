import { getJSON } from "./fetch";

/**
 * @param {Object} params
 * @param {AbortSignal} signal
 * @returns {Promise<{bookmarks: Array, currentPage: number, lastPage: number, fromCache: boolean}>}
 */

export async function getBookmarksWithCache(params, signal) {
    const { offset, limit, query, tag, category } = params;

    let searchParams = new URLSearchParams()
    searchParams.append("offset", offset);
    searchParams.append("limit", limit);
    if (query) searchParams.append("q", query);
    if (tag) searchParams.append("tag", tag);
    if (category) searchParams.append("category", category);
    const queryString = searchParams.toString();

    let cache = null;
    try {
        const cachedData = localStorage.getItem("neonlink_bookmarks_cache");
        if (cachedData) {
            cache = JSON.parse(cachedData);
        }
    } catch (error) {
        await resetBookmarksCache()
    }

    let meta;
    try {
        const res = await getJSON("/api/bookmarks/meta", signal);
        if (!res.ok) throw new Error("Meta fetch failed");
        meta = await res.json();
    } catch (error) {
        if (cache && cache.queries && cache.queries[queryString]) {
            return { ...cache.queries[queryString], fromCache: true };
        }
        throw error;
    }

    if (!cache || cache.hash !== meta.hash) {
        cache = { hash: meta.hash, queries: {} };
    }

    if (!cache.queries[queryString]) {
        try {
            let res = await getJSON(`/api/bookmarks/?${queryString}`, signal)

            if (res.ok) {
                let json = await res.json()
                cache.queries[queryString] = {
                    bookmarks: json.bookmarks,
                    currentPage: json.currentPage,
                    lastPage: json.lastPage
                };

                try {
                    localStorage.setItem("neonlink_bookmarks_cache", JSON.stringify(cache))
                } catch (error) {
                    if (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED") {
                        await resetBookmarksCache()
                    }
                }

                return {
                    ...cache.queries[queryString],
                    fromCache: false
                }
            } else {
                const err = await res.json()
                throw new Error(err.message || "Failed to fetch bookmarks");
            }
        } catch (error) {
            if (cache.queries[queryString]) {
                return { ...cache.queries[queryString], fromCache: true };
            }
            throw error;
        }
    }

    return { ...cache.queries[queryString], fromCache: true };
}

export async function resetBookmarksCache() {
    try {
        localStorage.removeItem("neonlink_bookmarks_cache")
        localStorage.removeItem("neonlink_bookmarks")
        localStorage.removeItem("neonlink_bookmarks_hash")
    } catch (error) {
        throw new Error(error.message || "Failed to remove localstorge items")
    }
}