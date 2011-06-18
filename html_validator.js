//HTML Validator By Peter West
//Original parser By John Resig (ejohn.org) http://ejohn.org/blog/pure-javascript-html-parser/
//and Erik Arvidsson (Mozilla Public License) http://erik.eae.net/simplehtmlparser/simplehtmlparser.js

var call = Object.prototype.call;
Object.prototype.call = function(fn) { 
  var args = Array.prototype.slice.call(arguments); 
  args.shift(); 
  return fn.apply(this, args); 
};

var each = function(fn) {
  for(var i in this) if (this.call(Object.hasOwnProperty, i)) this.call(fn, this[i], i, this);
  return this;
};

/*var map = function(fn, all) {
  if (typeof(fn) == 'string') var attrFn = function() { return this[fn]; };
  var array = [];
  for (var i = 0, obj; i < this.length; i++) {
    obj = this[i] !== undefined && this[i] !== null;
    if (obj || all) array.push((obj ? this[i] : false).call(attrFn || fn, i));
  }
  return array;
};*/

var map = function(fn) {
  var array = [];
  for (var i = 0, obj; i < this.length; i++) array.push(fn.apply(this, [this[i], i].concat(Array.prototype.slice.call(arguments).slice(1))));
  return array;
};

var get = function(item, key, attr) { return item[attr] };

/*var select = function(fn) {
  var array = [];
  this.call(map, function(i) { if (this.call(fn, i)) array.push(this); })
  return array;
};*/

var select = function(fn) {
  var array = [];
  this.call(map, function(item, i) { if (fn.apply(item, arguments)) array.push(item); })
  return array;
};

var method = function(obj, key, fn) {
  return fn.apply(obj, Array.prototype.slice.call(arguments, 2));
};

var sum = function(){
  for (var i = 0, sum = 0; i < this.length; i++) sum += this[i];
  return sum;
};

var mapEach = function(fn) {
  var array = [];
  this.call(each, function(item, name) { array.push({}.call(fn, item, name)); });
  return array;
};

var values = function() { return this.call(mapEach, function(item) { return item; }); };
var keys = function() { return this.call(mapEach, function(item, key) { return key; }); };

var merge = function(b) {
  var a = this;
  b.call(each, function(item, name) { a[name] = item; });
  return this;
};

var clone = function() {
  var obj = {};
  this.call(each, function(item, name) { obj[name] = item; });
  return obj;
};

var clone2 = function(obj) {
  var obj = {};
  obj.call(each, function(item, name) { obj[name] = item; });
  return obj;
};

var groupUnique = function() {
  var last, different;
  return this.call(select, function(item) { different = last != item; last = item; return different; });
};

var makeMap = function() {
  var obj = {};
  this.call(map, function(item, i) { obj[item] = i + 1; });
  return obj;
};

var draw = function(indent) {
  var text = "";
  if (this.unopened) text += (indent||"")+"</"+this.name+">\n";
  else {
    text += (indent||"")+(this.implicit ? "{<"+this.name+">}" : "<"+this.name+">")+"\n";
    if (this.children) text += this.children.call(map, function(child) { return child.call(draw, (indent||"")+"  "); }).join("");
    if (!this.unary && !this.selfClosed) text += (indent||"")+(this.closed ? "</"+this.name+">\n" : "{</"+this.name+">}\n");
  }
  return text;
};

var reassemble = function() {
  var html = "";
  if (this.html) html += this.html;
  if (this.children) html += this.children.call(map, function(child) { return child.call(reassemble); }).join("");
  if (this.endHtml) html += this.endHtml;
  return html;
};

var englishList = function(separator) {
  return this.slice(0, this.length -1).join(", ")+(this.length > 1 ? (separator || " and ") : "")+(this[this.length - 1] || "");
};

var inTag = function() { return "<"+this+">"; };
var htmlTags = function() { return this.call(select, function(tag) { return tag.name != "#text" && tag.name != "#comment"; }); };
var combineLists = function(a,b) { return b ? (b.slice(0,1) == "+" ? a+","+b.slice(1) : b) : a.slice(0); };
var combineArrays = function(a,b) { return (a || []).concat(b || []); }
var addAttributes = function(array, b) { 
  var a = this;
  array.call(map, function(item) { a[item] = b[item]; }); 
}
var stack = function() { return this.parent ? this.parent.call(stack).concat([this]) : [this]; };

var computedDescendents = function(doctype) {
  var allowed = {}, banned = {};
  this.call(stack).call(map, function(element) {
    if (doctype.tags[element.name]) {
      allowed.call(merge, doctype.tags[element.name].allowed_descendents || {});
      banned.call(merge, doctype.tags[element.name].banned_descendents || {});  
    }
  });
  if (doctype.tags[this.name]) {
    allowed = allowed.call(merge, doctype.tags[this.name].allowed_children || {});
  }
  banned.call(each, function(item, name) { if (allowed[name]) delete allowed[name]; });
  return allowed;
};

var expandList = function(groups) {
  if (!this.indexOf) return this;
  var map = this.split(",").call(makeMap);
  map.call(each, function(value, name) {
    if (groups[name]) {
      delete map[name];
      map.call(merge, groups[name].call(expandList, groups).call(each, function(item, tag, group) { group[tag] = value; }));
    }
  });
  return map;
};

var doctype = {
  groups: {},
  attrs: {},
  rulesets: {},
  
  extend: function(spec) {
    this.groups.call(each, function(groups, type) {
      spec.groups[type] = spec.groups[type] || {};
      groups.call(each, function(group, name) {
        spec.groups[type][name] = combineLists(group, spec.groups[type][name]);
      });
    });
    spec.attrs = spec.attrs || {};
    this.attrs.call(each, function(attrs, type) {
      spec.attrs[type] = combineArrays(attrs, spec.attrs[type]);
    });
    spec.rulesets = spec.rulesets || {};
    this.rulesets.call(each, function(rulesets, name) {
      spec.rulesets[name] = combineArrays(rulesets.call(map, method, clone), spec.rulesets[name]);
    });
    spec.call(addAttributes, ['extend','compute','validate','rules'], this);
    return spec;
  },
  
  compute: function() {
    if (this.computed) return;
    this.computed = true;
    this.groups.call(each, function(groupType, type) {
      groupType.call(each, function(group, name) {
        groupType[name] = group.call(expandList, groupType);
      });
    });
    var groups = this.groups;
    this.attrs.call(each, function(attrs) {
      attrs.call(map, function(rule) {
        rule.attrs = rule.attrs.call(expandList, groups.attrs);
        rule.attrs.call(each, function(attr, name) {
          rule.attrs[name] = rule.values;
        });
        if (rule.include) rule.include = rule.include.call(expandList, groups.tags);
        if (rule.exclude) rule.exclude = rule.exclude.call(expandList, groups.tags);
      });
    });
    this.rulesets.call(each, function(ruleset, name) {
      ruleset.call(map, function(rules) {
        rules.call(each, function(rule, type, rules) {
          rules[type] = rule.call(expandList, groups.tags, true);
        });
      });
    });
    var tags = this.tags = groups.tags.all.call(clone);
    tags.call(each, function(tag, name) {
      tags[name] = {};
    });
    this.rulesets.call(each, function(rules, ruleName) {
      rules.call(map, function(rule, i) {
        rule.tags.call(each, function(tag, name) {
          tags[name][ruleName] = tags[name][ruleName] || {};
          rule.innerTags.call(each, function(child, childName) {
            tags[name][ruleName][childName] = child;
            if (ruleName == "allowed_children" && tags[childName]) {
              tags[childName].allowed_parents = tags[childName].allowed_parents || {};
              tags[childName].allowed_parents[name] = true;
            }
          });
        });
      });
    });
    var attrGroups = this.attrs;
    this.tags.call(each, function(tag, name) {
      attrGroups.call(each, function(attrs, type) {
        tag.attrs = tag.attrs || {};
        tag.attrs[type] = tag.attrs[type] || {};
        attrs.call(map, function(attr) {
          if ((attr.include && attr.include[name]) || (attr.exclude && !attr.exclude[name])) {
            tag.attrs[type] = tag.attrs[type].call(merge, attr.attrs);
          }
        });
      });
    });

    groups.tags.implicit.call(each, function(tag, name) {
      if (tags[name].allowed_parents) {
        tags[name].allowed_parents.call(each, function(parent, parentName) {
          tags[parentName].implicit_children = tags[parentName].implicit_children || {};
          tags[parentName].implicit_children[(tags[parentName].exact_children || tags[parentName].ordered_children)[name]] = name;
        });
      }
    });
  },
  
  validate: function(doc) {
    var doctype = this;
    errors = [];
    doctype.rules.rules.call(each, function(rule, name) {
      doc.all.call(map, function(tag) {
        errors = errors.concat(tag.call(rule, doctype, doc, doctype.rulesets[name] || []).call(map, function(error) { 
          tag.message = tag.call(doctype.rules.messages[name]);
          return error;
        }));
      });
    });
    return errors.sort(function(a, b) { return a.line - b.line; }).call(map, function(error) { return error.message+" on line "+error.line; }).join("\n");
  },
  
  rules: {
    attributes: {
      number: /^\s*[0-9]+\s*$/,
      length: /^\s*[0-9]+%?\s*/,
      multi_length: /^\s*[0-9]+[%*]?\s*/,
      name: /^\s*[a-z][a-z0-9-_:.]*\s*$/i,
      names: /^\s*(([a-z][a-z0-9-_:.]*)|\s+)+$/i
    },
    rules: {
      allowed_attributes: function(doctype, doc) {
        var tag = this, attrs = [];
        var allowed = ((doctype.tags[tag.name] && doctype.tags[tag.name].attrs.optional) || {});
        var required = ((doctype.tags[tag.name] && doctype.tags[tag.name].attrs.required) || {});
        (tag.attrs || []).call(map, function(attr) {
          if (!allowed[attr.name] && !required[attr.name]) attrs.push(attr.name);
        });
        if (attrs.length > 0) return [{tag: tag, attrs: attrs, line: tag.line}];
        return [];
      },
      allowed_tags: function(doctype, doc) {
        if (doctype.groups.tags.all[this.name] || doctype.groups.tags.pseudo[this.name]) return [];
        return [this];
      },
      allowed_children: function(doctype, doc) {
        var tag = this, errors = [];
        var allowedDescendents = tag.call(computedDescendents, doctype);
        (tag.children || []).call(htmlTags).call(map, function(child) {
          if (!allowedDescendents[child.name]) errors.push({parent: tag, child: child, line: child.line});
        });
        return errors;
      },
      exact_children: function(doctype, doc, sets) {
        var tag = this, errors = [];
        sets.call(map, function(set) {
          if (set.tags[tag.name])
            if ((tag.children || []).call(htmlTags).call(select, function(child, i) { return i != set.innerTags[child.name] - 1; }).length > 0) 
              errors.push({parent: tag, children: set.innerTags, line: tag.line});
        });
        return errors;
      },
      exclusive_children: function(doctype, doc, sets) {
        var tag = this, errors = [];
        sets.call(map, function(set) {
          if (set.tags[tag.name])
            if ((tag.children || []).call(select, function(child) { return set.innerTags[child.name]; }).call(map, function(item) { return item.name; }).call(makeMap).call(keys).length > 1)
              errors.push({parent: tag, children: set.innerTags, line: tag.line });
        });
        return errors;
      },
      not_empty: function(doctype, doc) {
        return (doctype.groups.tags.not_empty[this.name] && (this.children || []).call(htmlTags).length == 0) ? [{tag: this, line: this.line}] : [];
      },
      not_opened: function(doctype, doc) {
        return (this.unopened) ? [{tag: this, line: this.line}] : [];
      },
      not_optionally_closed: function(doctype, doc) {
        return (!doctype.groups.tags.close_optional[this.name] && !doctype.groups.tags.unary[this.name] && !this.closed) ? [{tag: this, line: this.line}] : [];
      },
      ordered_children: function(doctype, doc, sets) {
        var tag = this, errors = [], position, error;
        sets.call(map, function(set) {
          if (set.tags[tag.name]) {
            error = false;
            position = 1;
            (tag.children || []).call(htmlTags).call(map, function(child, i) {
              if (set.innerTags[child.name] >= position) position = set.innerTags[child.name];
              else { error = true; }
            });
            if (error) errors.push({parent: tag, children: set.innerTags, line: tag.line});
          }
        });
        return errors;
      },
      required_attributes: function(doctype, doc) {
        var tag = this, attrs = [];
        ((doctype.tags[tag.name] && doctype.tags[tag.name].attrs.required) || {}).call(each, function(required, name) {
          if (!tag.attrs || !tag.attrs.call(map, function(item) { return item.name; }).call(makeMap)[name]) { attrs.push(name); }
        });
        if (attrs.length > 0) return [{tag: tag, attrs: attrs, line: tag.line}];
        return [];
      },
      required_first_child: function(doctype, doc, sets) {
        var tag = this, errors = [];
        sets.call(map, function(set) {
          if (set.tags[tag.name]) {
            if ((tag.children || []).call(htmlTags).length > 0) {
              tag.children.call(htmlTags).call(map, function(child, i) {
                if (i == 0 && !set.innerTags[child.name]) 
                  errors.push({parent: tag, child: set.innerTags.call(keys)[0], line: tag.line});
              });
            }
            else errors.push({parent: tag, child: set.innerTags.call(keys)[0], line: tag.line});
          } 
        });
        return errors;
      },
      required_at_least_one_child: function(doctype, doc, sets) {
        var tag = this, errors = [];
        sets.call(map, function(set) {
          if (set.tags[tag.name])
            if ((tag.children || []).call(select, function(child) { return set.innerTags[child.name]; }).call(map, get, "name").call(makeMap).call(keys).length < 1)
              errors.push({parent: tag, children: set.innerTags, line: tag.line});
        });
        return errors;
      },
      required_children: function(doctype, doc, sets) {
        var tag = this, errors = [];
        sets.call(map, function(set) {
          if (set.tags[tag.name]) {
            set.innerTags.call(each, function(innerTag, name) {
              var count = 0;
              (tag.children || []).call(map, function(child) {
                if (child.name == name) count++;
              });
              if (count < 1) errors.push({parent: tag, child: name, count: count, line: tag.line});
            });
          }
        });
        return errors;
      },
      unary: function(doctype, doc) {
        return (doctype.groups.tags.unary[this.name] && this.closed) ? [{tag: this, line: this.line}] : [];
      },
      unique_children: function(doctype, doc, sets) {
        var tag = this, errors = [];
        sets.call(map, function(set) {
          if (set.tags[tag.name]) {
            set.innerTags.call(each, function(innerTag, name) {
              var count = 0;
              (tag.children || []).call(map, function(child) {
                if (child.name == name) count++;
              });
              if (count > 1) errors.push({parent: tag, child: name, count: count, line: tag.line});
            });
          }
        });
        return errors;
      }
    },
    messages: {
      allowed_attributes: function() {
        return this.tag.name.call(inTag)+" can't have attribute"+(this.attrs.length > 1 ? "s" : "")+" "+this.attrs.call(englishList, " or ");
      },
      allowed_tags: function() {
        return this.name.call(inTag)+" is not a valid element";
      },
      allowed_children: function() {
        return this.parent.name.call(inTag)+" can't contain "+this.child.name.call(inTag);
      },
      exact_children: function() {
        return this.parent.name.call(inTag)+" must contain exactly "+this.children.call(keys).call(map, method, inTag).join(", ")+" but currently contains "+(this.parent.children || []).call(map, get, "name").call(map, method, inTag).join(", ");
      },
      exclusive_children: function() {
        return this.parent.name.call(inTag)+" can't contain both "+this.children.call(keys).call(map, method, inTag).call(englishList);
      },
      not_empty: function() {
        return this.tag.name.call(inTag)+" can't be empty";
      },
      not_opened: function() {
        return this.tag.name.call(inTag)+" must have an opening tag";
      },
      not_optionally_closed: function() {
        return this.tag.name.call(inTag)+" must have a closing tag";
      },
      ordered_children: function() {
        return "The contents of "+this.parent.name.call(inTag)+" must be ordered "+this.children.call(keys).call(map, method, inTag).join(", ")+" but are currently ordered "+(this.parent.children.call(htmlTags) || []).call(map, get, "name").call(groupUnique).call(map, method, inTag).join(", ");
      },
      required_attributes: function() {
        return this.tag.name.call(inTag)+" must have attribute"+(this.attrs.length > 1 ? "s" : "")+" "+this.attrs.call(englishList);
      },
      required_first_child: function() {
        return "The contents of "+this.parent.name.call(inTag)+" must start with "+this.child.call(inTag);
      },
      required_at_least_one_child: function() {
        return this.parent.name.call(inTag)+" must contain at least one of "+this.children.call(keys).call(map, method, inTag).call(englishList, " or ");
      },
      required_children: function() {
        return this.parent.name.call(inTag)+" must contain "+this.child.call(inTag);
      },
      unary: function() {
        return this.tag.name.call(inTag)+" should not have a closing tag (it is self closing)";
      },
      unique_children: function() {
        return this.parent.name.call(inTag)+" can't contain more than one "+this.child.call(inTag)+", found "+this.count;
      }
    }
  }
};

var htmlParser = function(html, doctype) {
  var startTag = /<(\w+)((?:\s+\w+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/;
  var endTag = /<\/(\w+)[^>]*>/;
  var attr = /(\w+)(?:\s*=\s*(?:(?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')|([^>\s]+)))?/g;
  var doc = { name: '#root', children: [], all: [], closed: true };
  doc.all.push(doc);
  var index, match, endedTag, lastHtml = html, current = doc;
  var depth = function(tag) { return current.call(stack).call(map, get, "name").call(makeMap)[tag] - 1; };
  var min = function() { return Math.min.apply({}, this); };
  var last = function() { return this[this.length - 1]; };
  
  var allowedDescendents = function() {
    var obj = {};
    this.call(stack).call(map, function(tag) { 
      obj.call(merge, doctype.tags[tag.name].allowed_descendents || {}); 
    });
    obj.call(merge, doctype.tags[this.name].allowed_children || {});
    return obj;
  };
  
  var parseStartTag = function(html, tag, rest, selfClosed) {
    var prev = current.children.call(htmlTags).call(last);
    if (doctype.tags[current.name] && doctype.tags[current.name].implicit_children) {
      var implicit = false;
      doctype.tags[current.name].implicit_children.call(each, function(implicitChild, position) {
        if (implicit) return;
        if (doctype.tags[current.name].exact_children) {
          if (implicitChild != tag && current.children.call(htmlTags).length + 1 == position) {
            implicit = implicitChild;
          }
        }
        else if (doctype.tags[current.name].ordered_children) {
          var orderedChildren = doctype.tags[current.name].ordered_children;
          var children = current.children.call(htmlTags);
          var invalidBeforeTags = children.call(select, function(child) { return orderedChildren[child] > position; }).length;
          if (invalidBeforeTags == 0 && (!orderedChildren[tag] || orderedChildren[tag] > position)) {
            implicit = implicitChild;
          }
        }
      });
      if (implicit && (!prev || prev.name+"" != implicit || !prev.implicit)) {
        var element = {name: implicit, implicit: true, attrs: [], parent: current, unary: false, children: [], html: ''};
        current.children.push(element);
        doc.all.push(element);
        current = element;
        return parseStartTag(html, tag, rest, selfClosed);
      }
    }
    
    if (doctype.groups.tags.close_optional[current.name]) {
      if (!current.call(allowedDescendents)[tag] && !doctype.groups.tags.last_child[current.name]) {
        parseEndTag("", current.name);
        return parseStartTag(html, tag, rest, selfClosed);
      }
    }

    var unary = doctype.groups.tags.unary[tag] || !!selfClosed;
    var attrs = [];
    rest.replace(attr, function(match, name) {
      var value = arguments[2] || arguments[3] || arguments[4] || (doctype.tags[tag].attrs.optional[name] || doctype.tags[tag].attrs.required[name] ? name : "");
      attrs.push({ name: name, value: value, escaped: value.replace(/(^|[^\\])"/g, '$1\\\"') });
    });
    var element = { name: tag, implicit: !html, attrs: attrs, parent: current, unary: unary, selfClosed: !!selfClosed, children: [], html: html };
    current.children.push(element);
    doc.all.push(element);
    if (!unary) current = element;
  };
  
  var parseEndTag = function(html, tag) {
    var index = tag ? current.call(depth, tag) : 0;
    var endedTags = index >= 0 ? current.call(stack).slice(index) : [];
    if (endedTags.length > 0) {
      endedTags.call(each, function(tag) {
        if (doctype.tags[current.name] && doctype.tags[tag.name].implicit_children) {
          doctype.tags[tag.name].implicit_children.call(each, function(implicit) {
            if (tag.children.call(select, function(child) { return child.name+"" == implicit; }).length == 0)
              tag.children.push({ name: implicit, implicit: true, children: [], parent: tag, html: '' });
          });
        }
      });
      var endedTag = endedTags[0];
      if (html) { 
        endedTag.closed = true;
        endedTag.endHtml = html;
      }
      current = endedTag.parent;
    }
    else if (doctype.tags[current.name] && doctype.tags[current.name].implicit_children && doctype.tags[current.name].implicit_children.call(values).call(makeMap)[tag]) {
      parseStartTag("", tag, "", false);
      return parseEndTag(html, tag);
    }
    else { 
      var element = {name: tag, unopened: true, closed: true, endHtml: html};
      current.children.push(element);
      doc.all.push(element);
    }
  };
 
  while (html) {
    if (current && doctype.groups.tags.cdata_elements[current.name]) {
      //removed "[^>]*" from regex end, need to check
      html = html.replace(new RegExp("(.*)<\/"+current.name+">"), function(all, text) {
        //need more robust solution, and logging of whether cdata tag is used
        text = text.replace(/<!--(.*?)-->/g, "$1").replace(/<!\[CDATA\[(.*?)]]>/g, "$1");
        current.children.push({name: '#text', value: text, unary: true, html: all});
        return "";
      });
      parseEndTag("", current.name);
    } 
    else if (html.indexOf("<!--") == 0) {
      var end = html.indexOf("-->");
      current.children.push({ name: "#comment", value: html.substring(4, end), html: html.substring(0, end + 3), closed: end != -1 });
      html = end == -1 ? "" : html.substring(end + 3);
    }
    else if (html.search(endTag) == 0) {
      match = html.match(endTag);
      html = html.substring(match[0].length);
      match[0].replace(endTag, parseEndTag);
    }
    else if (html.search(startTag) == 0) {
      match = html.match(startTag);
      html = html.substring(match[0].length);
      match[0].replace(startTag, parseStartTag);
    }
    else {
      var matches = [html.search(startTag), html.search(endTag), html.indexOf("<!--")];
      index = (matches.call(select, function(match) { return match >= 0; }) || []).call(min);
      var text = index < 0 ? html : html.substring(0, index);
      current.children.push({name: '#text', value: text, html: text, unary: true});
      html = index < 0 ? "" : html.substring(index);
    }
    if (html == lastHtml) throw "Parse Error: " + html;
    lastHtml = html;
  }
  parseEndTag("");
  var newlines = function() { return (this.match(/(\r\n|\n|\r)/g) || []).length; };
  var line = 1;
  var findLines = function() {
    this.line = line; 
    if (this.html) line += this.html.call(newlines);
    if (this.children) this.children.call(map, function(child) { child.call(findLines); });
    if (this.endHtml) line += this.endHtml.call(newlines);
  };
  doc.call(findLines);
  return doc;
};

var html = "<title></title>\n<form action=''><fieldset><legend></legend><input><!--</html><!-- :D --></fieldset>\n</form><table>\n<col>\n<tr><td></tbody></table>\n<del><p>hallo</p></del>\n</body></html>";
var spec = new html_401_spec(doctype);
spec.compute();
var doc = htmlParser(html, spec.transitional);
console.log(spec);
console.log(doc);
console.log(doc.call(draw));
console.log(spec.transitional.validate(doc));

//Object.prototype.call = call;