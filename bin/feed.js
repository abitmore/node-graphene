var _ = require('underscore'),
_str = require('underscore.string'),
utils = require('./utils'),
moment = require('moment'),
async = require('async'),
argv = require('yargs').argv
lib  = require('../lib/');

var die = function() {
  console.log("bin/feed");
  console.log("");
  console.log("USAGE: bin/feed.js url feed *args");
  process.exit(1);
}

if(argv._.length < 1){
  die();
  return;
}

var logErr = function(err){
  console.log(err);
};

var cmd = function(client,args,cb){
  var asset = "USD";
  if(args.length > 0){
    asset = args[0].toUpperCase();
  }
  client.get_asset(asset,function(err,_a){
    if(err){return cb(err);}
    var prec = Math.pow(10,5-_a.precision);
    client.get_bitasset_data(asset,function(err,a){
      if(err){return cb(err);}
      var feeds = a.feeds;
      var now = new Date();
      var feeds = async.map(feeds, function(accs,_cb){
        client.get_account(accs[0],function(err,a){
          if(err){return cb(err)};
          var date = new Date(accs[1][0]);
          var delta = moment(now).diff(moment(date),"minutes");
          var core_exchange_rate = accs[1][1].core_exchange_rate;
          var value = prec*core_exchange_rate.base.amount/core_exchange_rate.quote.amount;
          var res = _str.sprintf("%.8f",value);
          var resInv = _str.sprintf("%.2f",1/value);
          _cb(false,{account:a.name, date:date, delta:delta, res:res, resInv:resInv});
        });
      },function(err, feeds){
        if(err){return cb(err)};
        feeds = _.sortBy(feeds,function(f){
          return -f.date;
        });
        var res = ""
        res = _.reduce(feeds,function(s,f){
          return s+_str.sprintf("%s min: %-4d %s\n",f.resInv,f.delta,f.account);
        },"");
        cb(false,res);
      });
    });
  });
};

var main = function(){
  var url = argv._[0];
  var args = utils.parseArgs(argv._.slice(1));

  console.log(args);
  lib.wallet.createWalletClient(url,function(err,client){
    if(err){console.log(err);process.exit()};
    // Launch command
    cmd(client,args,function(err,r){
      if(err){
        console.log("ERROR",err);
      }
      else{
        console.log(r);
      }
      client.close();
    });
  });

};
main();