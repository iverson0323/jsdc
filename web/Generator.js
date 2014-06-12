define(function(require, exports, module) {
  var homunculus = require('homunculus');
  var JsNode = homunculus.getClass('Node', 'es6');
  
  var Class = require('./util/Class');
  
  var Generator = Class(function(jsdc) {
    this.jsdc = jsdc;
    this.hash = {};
    this.yie = {};
  }).methods({
    parse: function(node, start) {
      if(start) {
        this.jsdc.ignore(node.leaf(1));
        var token = node.leaf(2).first().token();
        //有可能被scope前置过
        var hasPre = token.ignore;
        //忽略本身
        this.jsdc.ignore(node.first());
        this.jsdc.ignore(token);
        if(!hasPre) {
          this.jsdc.append('var ');
          this.jsdc.append(node.leaf(2).first().token().content());
          this.jsdc.append('=');
        }
        var state = this.jsdc.uid();
        var temp = this.jsdc.uid();
        var o = this.hash[node.nid()] = {
          state: state,
          index: 0,
          temp: temp,
          yield: []
        };
        this.jsdc.append('function(){');
        this.jsdc.append('var ' + state + '=0;');
        this.jsdc.append('return ');
        this.jsdc.append('function (){return {next:' + temp + '}};');
        o.pos = this.jsdc.res.length;
        this.jsdc.append('function ' + temp);
      }
      else {
        this.jsdc.appendBefore('}();');
      }
    },
    yield: function(node, start) {
      var top = this.closest(node);
      var o = this.hash[top.nid()];
      if(start) {
        if(o.index++ != 0) {
          this.jsdc.append('case ' + (o.index - 1) + ':');
        }
        this.jsdc.ignore(node.first());
        this.jsdc.append('arguments[0];return ');
        //yield *
        if(node.size() > 2
          && node.leaf(1).name() == JsNode.TOKEN
          && node.leaf(1).token().content() == '*') {
          this.jsdc.ignore(node.leaf(1));
          this.yie[node.nid()] = true;
        }
        else {
          this.jsdc.append('{value:');
        }
      }
      else {
        if(this.yie.hasOwnProperty(node.nid())) {
          this.jsdc.appendBefore('()');
        }
        else {
          this.jsdc.appendBefore(',done:false}');
          o.yield.push(this.jsdc.i);
        }
      }
    },
    body: function(node, start) {
      var top = node.parent();
      if(top.name() == JsNode.GENDECL) {
        var o = this.hash[top.nid()];
        if(start) {
          this.jsdc.append('switch(' + o.state + '++){case 0:');
        }
        else {
          if(o.index) {
            var i = o.yield[o.yield.length - 1];
            i = this.jsdc.res.lastIndexOf(',done:false}', i);
            this.jsdc.replace('true};default:', i + 6, 6);
          }
          this.jsdc.appendBefore(';return{done:true}}');
        }
      }
    },
    closest: function(node) {
      var parent = node;
      while(parent = parent.parent()) {
        if(parent.name() == JsNode.GENDECL) {
          return parent;
        }
      }
    },
    prevar: function(varstmt) {
      var top = varstmt.gen;
      if(top) {
        this.jsdc.ignore(varstmt.first());
        this.jsdc.insert('var ' + varstmt.leaf(1).first().first().token().content() + ';', this.hash[top.nid()].pos);
      }
    }
  });
  
  module.exports = Generator;
  
});