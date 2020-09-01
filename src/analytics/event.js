export default function event(firebase, name, params) {
  console.debug("analytics event", name, params);
  if (!firebase.analytics) {
    return;
  }
  firebase.analytics().logEvent(name, params);
}
