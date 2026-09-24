chrome.runtime.onInstalled.addListener((e) => {
	e.reason === "install" && console.log("CCTV GeoPlanner Extension installed successfully.");
}), chrome.action.onClicked.addListener(async (e) => {
	if (!e.id) return;
	let t = e.url || "";
	if (t.includes("earth.google.com") || t.includes("google.com/maps")) try {
		await chrome.tabs.sendMessage(e.id, { type: "TOGGLE_OVERLAY" });
	} catch {}
	else chrome.tabs.create({ url: "https://earth.google.com/web/" });
});
//#endregion
