let routes = {};
let onRouteChange = () => {};

function getRouteFromHash() {
  return location.hash.replace(/^#/, "") || "/";
}

export function defineRoutes(routeMap) {
  routes = routeMap;
}

export function startRouter(renderFn) {
  function handleRoute() {
    const route = getRouteFromHash();
    if (routes[route]) {
      renderFn(routes[route], route);
      onRouteChange(route);
    }
  }
  window.addEventListener("hashchange", handleRoute);
  handleRoute();
}

export function onRoute(callback) {
  onRouteChange = callback;
}

export function route(path) {
  location.hash = path;
}
