(function() {
    "use strict";

    //#region Code from https://github.com/NiklasGollenstede/web-ext-utils/blob/master/utils/index.js#L19
    //By Niklas Gollenstede, Licensed under Mozilla Public License 2.0

    /// escapes a string for usage in a regular expression
    const escape = string => string.replace(/[\-\[\]\{\}\(\)\*\+\?\.\,\\\^\$\|\#]/g, '\\$&');

    /// matches all valid match patterns (except '<all_urls>') and extracts [ , scheme, host, path, ]
    const matchPattern = (/^(?:(\*|http|https|file|ftp|app):\/\/(\*|(?:\*\.)?[^\/\*]+|)\/(.*))$/i);

    /**
     * Transforms a valid match pattern into a regular expression which matches all URLs included by that pattern.
     * Passes all examples and counter-examples listed here https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Match_patterns#Examples
     * @param  {string}  pattern  The pattern to transform.
     * @return {RegExp}           The patterns equivalent as a RegExp.
     * @throws {TypeError}        If the pattern string is not a valid MatchPattern
     */
    function matchPatternToRegExp(pattern) {
        if (pattern === '<all_urls>') { return (/^(?:https?|file|ftp|app):\/\//); } // TODO: this is from mdn, check if chrome behaves the same
        const match = matchPattern.exec(pattern);
        if (!match) { throw new TypeError(`"${ pattern }" is not a valid MatchPattern`); }
        const [ , scheme, host, path, ] = match;
        return new RegExp('^(?:'
            + (scheme === '*' ? 'https?' : escape(scheme)) +':\/\/'
            + (host === '*' ? '[^\/]+?' : escape(host).replace(/^\\\*\\./g, '(?:[^\/]+?.)?'))
            + (path ? '\/'+ escape(path).replace(/\\\*/g, '.*') : '\/?')
        +')$');
    }

    //#endregion

    //Rule sets for Amazon sites that have Amazon Smile.
    const rules = [
        { domain: "amazon.co.uk", filter: "*://www.amazon.co.uk/*", cookies: ["at-acbuk", "sess-at-acbuk"], redirectDomain: "smile.amazon.co.uk" },
        { domain: "amazon.com"  , filter: "*://www.amazon.com/*"  , cookies: ["at-main" , "sess-at-main" ], redirectDomain: "smile.amazon.com"   },
        { domain: "amazon.de"   , filter: "*://www.amazon.de/*"   , cookies: ["at-acbde", "sess-at-acbde"], redirectDomain: "smile.amazon.de"    },
    ];

    //Convert filter style patterns to regex.
    rules.forEach((obj) => {
        obj.pattern = matchPatternToRegExp(obj.filter);
    });

    //Add event listener for new requests.
    browser.webRequest.onBeforeRequest.addListener(
        async (details) => {
            //Get rule set for matched domain.
            let url = new URL(details.url);
            let rule = rules.find(obj => obj.pattern.test(url.href));

            //Get executing tab so we know what cookie store it uses.
            let tab = await browser.tabs.get(details.tabId);

            //Make sure we aren't already on the hostame we want to redirect to.
            if (!tab || !rule || rule.redirectDomain === url.hostname)
                return;

            //Get the url with the new hostname.
            url.hostname = rule.redirectDomain;
            let redirect = url.href;

            //Get all cookies for our matched domain.
            let cookies = await browser.cookies.getAll({ domain: rule.domain, storeId: tab.cookieStoreId });

            //Check if all of the cookies we expect to exist when logged in do exist.
            let loggedIn = cookies.filter(cookie => rule.cookies.includes(cookie.name)).length === rule.cookies.length;
            if (loggedIn)
                return { redirectUrl: redirect };
        },
        {
            urls: rules.map(obj => obj.filter),
            types: ["main_frame"] //sub_frame?
        },
        ["blocking"]
    );
}());