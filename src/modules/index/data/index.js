/**
 * Created by ppf on 9/8/15.
 */

var headerData = require("../../../data/header.js"),
    globalData = require("../../../data/global.js"),
    extend = require("extend");

var data = {
    a : 1,
    b : 2
};

data = extend(data,headerData,globalData);
module.exports = data;
