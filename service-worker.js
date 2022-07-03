var cacheName = 'cache-v5';

//Files to save in cache
var files = [
  //'./',
  './index.html', 
  './favicon.ico',
  './favicon.svg',
  './manifest.json',
  './register-sw.js',
  './service-worker.js',
  
  './css/main.css',
  './css/misc.css', 
];

//Adding `install` event listener
self.addEventListener('install', (event) => {
  console.info('Event: Install');

  event.waitUntil(
    caches.open(cacheName)
    .then((cache) => {
      //[] of files to cache & if any of the file not present `addAll` will fail
      return cache.addAll(files)
      .then(() => {
        console.info('All files are cached');
        return self.skipWaiting(); //To forces the waiting service worker to become the active service worker
      })
      .catch((error) =>  {
        console.error('Failed to cache', error);
      })
    })
  );
});

/*
  FETCH EVENT: triggered for every request made by index page, after install.
*/

//Adding `fetch` event listener
self.addEventListener('fetch', (event) => {
  console.info('Event: Fetch');

  var request = event.request;
  var url = new URL(request.url);
  if (url.origin === location.origin) {
    // Static files cache
    event.respondWith(cacheFirst(request));
  } else {
    // Dynamic API cache
    event.respondWith(networkFirst(request));
  }

  // // Checking for navigation preload response
  // if (event.preloadResponse) {
  //   console.info('Using navigation preload');
  //   return response;
  // }
});

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  return cachedResponse || fetch(request);
}

async function networkFirst(request) {
  const dynamicCache = await caches.open(cacheName);
  try {
    const networkResponse = await fetch(request);
    // Cache the dynamic API response
    dynamicCache.put(request, networkResponse.clone()).catch((err) => {
      console.warn(request.url + ': ' + err.message);
    });
    return networkResponse;
  } catch (err) {
    const cachedResponse = await dynamicCache.match(request);
    return cachedResponse;
  }
}

/*
  ACTIVATE EVENT: triggered once after registering, also used to clean up caches.
*/

//Adding `activate` event listener
self.addEventListener('activate', (event) => {
  console.info('Event: Activate');

  //Navigation preload is help us make parallel request while service worker is booting up.
  //Enable - chrome://flags/#enable-service-worker-navigation-preload
  //Support - Chrome 57 beta (behing the flag)
  //More info - https://developers.google.com/web/updates/2017/02/navigation-preload#the-problem

  // Check if navigationPreload is supported or not
  // if (self.registration.navigationPreload) { 
  //   self.registration.navigationPreload.enable();
  // }
  // else if (!self.registration.navigationPreload) { 
  //   console.info('Your browser does not support navigation preload.');
  // }

  //Remove old and unwanted caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== cacheName) {
            return caches.delete(cache); //Deleting the old cache (cache v1)
          }
        })
      );
    })
    .then(function () {
      console.info("Old caches are cleared!");
      // To tell the service worker to activate current one 
      // instead of waiting for the old one to finish.
      return self.clients.claim(); 
    }) 
  );
});