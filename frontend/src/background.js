// Configure side panel to open on toolbar action click
if (chrome.sidePanel?.setPanelBehavior) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('Failed to configure side panel behavior:', error));
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('ATS Resume Builder Chrome Extension installed.');
});
