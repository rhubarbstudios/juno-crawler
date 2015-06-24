'use strict';

var _ = require('lodash');
var rp = require('request-promise');
var cheerio = require('cheerio');
var prompt = require('prompt');
var URL = require('url');

var restaurantLinks = [];
var menuUrls = [];
var xhrURL;
var numberOfPages = 1;

prompt.start();
prompt.get(['Url for first page of yelp search'], function(err, result) {
  var url = result['Url for first page of yelp search'];
  // url = 'http://www.yelp.com/search?find_desc=fast+casual&find_loc=90013&ns=1#start=0&l=g:-118.351764679,33.9763923189,-118.137187958,34.1186263355';
  getXHRUrl(url)
    .then(function() {
      getPageOfResults(0);
    });
});

function getXHRUrl(url) {
  return new Promise(function(resolve, reject) {
    var p = URL.parse(url);
    // var query = parsedUrl.query;
    // var hash = parsedUrl.hash;

    var query = p.query.replace('+', '%20').split('&');
    var hash = p.hash.split('&');

    // console.log('hash: ', hash[1]);
    xhrURL = [
      'http://www.yelp.com/search/snippet?' + query[0] + '&' + query[1] + '&start=',
      '&' + hash[1].replace(/,/g, '%2C').replace(/:/g, '%3A')
    ];

    // console.log('xhrURL:   ', xhrURL);



    // var finalUrl = 'http://www.yelp.com/search/snippet?find_desc=fast%20casual&find_loc=90013&start=0&l=g%3A-118.351764679%2C33.9763923189%2C-118.137187958%2C34.1186263355&parent_request_id=b88e1619e28df2cc&request_origin=hash&bookmark=true';
    // console.log('finalurl: ', finalUrl);
    // console.log(xhrURL === finalUrl);
    resolve(xhrURL);
  });
}

// getPageOfResults(0);
var url = 'http://www.yelp.com/search/snippet?find_desc=fast%20casual&find_loc=90013&start=10&l=g%3A-118.2225968507538%2C34.06172534283012%2C-118.27649852311708%2C34.02616532778361&parent_request_id=c5a894eb7d1ba114&request_origin=hash&bookmark=true';



function getPageOfResults(start) {
  return new Promise(function(resolve, reject) {
    console.log('searching page: ', start / 10 + 1);
    // rp('http://www.yelp.com/search?find_desc=fast+casual&find_loc=90013&ns=1#start=' + start + '&l=g:-118.2225968507538,34.06172534283012,-118.27649852311708,34.02616532778361')
    rp(xhrURL[0] + start + xhrURL[1])
      // .then(pause)
      .then(function(result) {
        if (start === 0) {
          return setNumberOfPages(result);
        } else {
          return Promise.resolve(result);
        }
      })
      .then(extractRestaurantLinks)
      .then(function(links) {
        // console.log('links: ', links);
        start += 10;
        if (start < numberOfPages * 10) {
          getPageOfResults(start);
        } else {
          console.log('\n\nRestaurant Slugs:');
          console.log(restaurantLinks);
          console.log('\n\n');
          processRestaurant(restaurantLinks.pop())
        }
      });
  });
}

function processRestaurant(restaurant) {
  console.log('loading restautant: ', restaurant);
  rp('http://www.yelp.com/biz/' + restaurant)
    .then(function(html) {
      var $ = cheerio.load(html);
      var menuLink = $('.menu-explore');
      var externalMenuLink = $('.external-menu');
      if (menuLink.length) {
        menuUrls.push('http://www.yelp.com' + menuLink.attr('href'));
      } else if (externalMenuLink.length) {
        menuUrls.push(externalMenuLink.attr('href'));
      }

      if (restaurantLinks.length) {
        processRestaurant(restaurantLinks.pop());
      } else {
        console.log('\n\n\n\n');
        console.log('Menu Links:');
        _.each(menuUrls, function(url) {
          console.log(url);
        });
      }
    });
}

function setNumberOfPages(result) {
  return new Promise(function(resolve, reject) {
    var json = JSON.parse(result);
    numberOfPages = parseInt(Math.ceil(json.search_header.match(/Showing \d+-\d+ of \d+/)[0].split(' ').pop() / 10));
    console.log('number of pages found: ', numberOfPages);
    resolve(result);
  });
}

function pause(data) {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      resolve(data);
    }, 5000);
  });
}

function extractRestaurantLinks(json) {
  return new Promise(function(resolve, reject) {
    console.log('extracting restaurant links from page');

    var j = JSON.parse(json);

    var markers = j.search_map.markers;

    // console.log('markers: ', markers);

    _.each(markers, function(marker) {
      var url = marker.url.replace('/biz/', '');
      if (url[0] !== '/') {
        restaurantLinks.push(url);
      }
    });
      // for (var marker in markers) {
      //   var url = marker.url.replace('/biz/', '');
      //   restaurantLinks.push(url)
      // }



    // var $ = cheerio.load(html);

    // $('.biz-name').each(function() {
    //   console.log('parsing restaurant');
    //   var link = $(this).attr('href').replace('/biz/', '').replace('?osq=fast+casual', '');
    //   if (link[0] !== '/') {
    //     restaurantLinks.push(link);
    //   }
      
    // });

    resolve(restaurantLinks);
  });
    
}
