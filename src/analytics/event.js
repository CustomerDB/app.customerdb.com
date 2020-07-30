export default function event(name, params) {
  console.debug("analytics event", name, params);
  window.firebase.analytics().logEvent(name, params);
}
