// NOTE: Has to be run after the window has loaded.
// We had to modify the default Intercom embed, as the Termly deferred enablement
// (based on the user's cookie preference) will set an onload event too late on the
// window DOM element.
export function loadIntercom() {
  (function () {
    var w = window;
    var ic = w.Intercom;
    if (typeof ic === "function") {
      ic("reattach_activator");
      ic("update", w.intercomSettings);
    } else {
      var d = document;
      var i = function () {
        i.c(arguments);
      };
      i.q = [];
      i.c = function (args) {
        i.q.push(args);
      };
      w.Intercom = i;
      var l = function () {
        var s = d.createElement("script");
        s.type = "text/javascript";
        s.async = true;
        s.src = "https://widget.intercom.io/widget/xdjuo7oo";
        var x = d.getElementsByTagName("script")[0];
        x.parentNode.insertBefore(s, x);
      };
      l();
    }
  })();
}
