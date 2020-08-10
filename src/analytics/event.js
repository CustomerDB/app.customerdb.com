export default function event(name, params) {
  console.debug("analytics event", name, params);
  if (!window.firebase.analytics) {
    return;
  }
  window.firebase.analytics().logEvent(name, params);
}
