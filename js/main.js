/**
 * Copyright 2014 Paul G. Baumstarck
 * MIT License
 */


/**
 * What role a regular expression is playing: that of matching lines or that
 * of replacing substrings.
 * @enum {number}
 */
var RegexKind = {
  MATCH: 0,
  REPLACE: 1
};


/**
 * A record type representing a displayed regular expression.
 * @typedef {{kind: RegexKind,
 *            enabled: boolean,
 *            caseSensitive: boolean,
 *            globalReplace: boolean,
 *            regex: !RegExp,
 *            replacement: (string|undefined),
 *            id: number}}
 */
var Regex;


angular.module('regexworks', ['ui.bootstrap']);


/**
 * The controller for the regular expression application.
 * @param {!angular.Scope} $scope The AngularJS scope.
 */
function RegexWorksCtrl($scope) {
  this.scope_ = $scope;
  this.scope_.RegexKind = RegexKind;

  // var isBlank = window.location.href.match(/\/blank$/) != null;

  // A unique ID we give to each regex, so that we can gives their DOM
  // elements derived unique IDs for linking labels to controls.
  this.regexId_ = 0;
  // What kind of splitter we are using for our lnes. Could be an enum,
  // but not going to go overboard on this one.
  this.scope_.splitter = 'newlines';
  // The default custmo regular expression splitter.
  this.scope_.splitterRegex = '\\s+';
  // Demo input lines to start out with.
  this.scope_.input = '';
  // Initialize the processed output lines.
  this.scope_.lines = [];
  // The demo regular expressions to start out with: one for matching and
  // one for replacing.
  this.scope_.regexes = [];
  this.scope_.showProcessedInput = true;

  this.scope_.loadDemo = _.bind(this.loadDemo_, this);

  var match = window.location.hash.match(/^#demo(\d+)/);
  if (match) {
    this.loadDemo_(parseInt(match[1], 10));
  }

  // Bind instance methods to the scope.
  this.scope_.addNewRegex = _.bind(this.addNewRegex, this);
  this.scope_.removeRegex = _.bind(this.removeRegex, this);
  this.scope_.moveRegex = _.bind(this.moveRegex, this);
  this.scope_.getRegexStatusTooltip = _.bind(this.getRegexStatusTooltip, this);

  // Watch changes on any inputs to recompile the output lines.
  var computeOutput = _.bind(this.computeOutput_, this);
  this.scope_.$watch('input', computeOutput);
  this.scope_.$watch('splitter', computeOutput);
  this.scope_.$watch('splitterRegex', computeOutput);
  this.scope_.$watch('regexes', computeOutput, true);
}


/**
 * Loads a numbered demo.
 * @param {number} number YFIO.
 */
RegexWorksCtrl.prototype.loadDemo_ = function(number) {
  if (number === undefined) {
    window.history.replaceState({}, 'clear', '/#');
    this.scope_.input = '';
    this.scope_.regexes = [];
  } else {
    window.history.replaceState({}, 'demo' + number, '/#demo' + number);
    if (number == 1) {
      this.scope_.splitter = 'newlines';
      this.scope_.splitterRegex = '\\s+';
      this.scope_.input = 'foo 1\nfoo A\nfoo 2\nbar B\nbar 3\nbar C';
      this.scope_.regexes = [{
        kind: RegexKind.MATCH,
        enabled: true,
        caseSensitive: false,
        globalReplace: true,
        regex: 'F',
        replacement: '',
        id: this.regexId_++
      }, {
        kind: RegexKind.REPLACE,
        enabled: true,
        caseSensitive: false,
        globalReplace: true,
        regex: '(\\d)',
        replacement: '$1-$1',
        id: this.regexId_++
      }];
    } else if (number == 2) {
      this.scope_.splitter = 'newlines';
      this.scope_.splitterRegex = '\\s+';
      this.scope_.input = 'To be, or not to be: that is the question:\n' +
          'Whether \'tis nobler in the mind to suffer\n' +
          'The slings and arrows of outrageous fortune,\n' +
          'Or to take arms against a sea of troubles,\n' +
          'And by opposing end them? To die: to sleep;\n' +
          'No more; and by a sleep to say we end\n' +
          'The heart-ache and the thousand natural shocks\n' +
          'That flesh is heir to, \'tis a consummation\n' +
          'Devoutly to be wish\'d. To die, to sleep;\n' +
          'To sleep: perchance to dream: ay, there\'s the rub;\n' +
          'For in that sleep of death what dreams may come\n' +
          'When we have shuffled off this mortal coil,\n' +
          'Must give us pause: there\'s the respect\n' +
          'That makes calamity of so long life;\n';
      this.scope_.regexes = [{
        kind: RegexKind.MATCH,
        enabled: true,
        caseSensitive: true,
        globalReplace: true,
        regex: 'to',
        replacement: '',
        id: this.regexId_++
      }, {
        kind: RegexKind.REPLACE,
        enabled: true,
        caseSensitive: false,
        globalReplace: true,
        regex: '([^\\saeiou])e(?![aeiou])',
        replacement: 'e$1',
        id: this.regexId_++
      }];
    }
  }
};


/**
 * Computes the output lines based on the current selections.
 * @private
 */
RegexWorksCtrl.prototype.computeOutput_ = function() {
  var splitter = null;
  if (this.scope_.splitter == 'regex') {
    splitter = new RegExp(this.scope_.splitterRegex, 'i');
  } else {
    splitter = /\r?\n/;
  }
  // Initialize the processed input lines.
  this.scope_.lines = _.map(
      this.scope_.input.split(splitter), function(line) {
        return {
          text: line,
          regexStatuses: [],
          currentText: null,
          alive: true
        };
      });
  _.each(this.scope_.lines, function(line) {
    line.currentText = line.text;
    line.alive = true;
  });
  // Apply all regexes to all lines, in order, assigning unique IDs to the
  // regular expression status stricts.
  var rix = 0;
  _.each(this.scope_.regexes, function(regex) {
    var actualRegexp = new RegExp(
        regex.regex,
        (regex.globalReplace ? 'g' : '') + (regex.caseSensitive ? '' : 'i'));
    _.each(this.scope_.lines, function(line) {
      var regexStatus;
      if (!regex.enabled) {
        regexStatus = {regex: regex};
      } else {
        var isMatch = line.currentText.match(actualRegexp) != null;
        regexStatus = {
          regex: regex,
          input: line.currentText,
          output: line.currentText,
          matched: isMatch
        };
        if (regex.kind == RegexKind.MATCH) {
          line.alive = line.alive && isMatch;
        } else if (regex.kind == RegexKind.REPLACE) {
          line.currentText = line.currentText.replace(
              actualRegexp, regex.replacement);
          regexStatus.output = line.currentText;
        }
      }
      line.regexStatuses[rix] = regexStatus;
    });
    ++rix;
  }, this);
  this.scope_.output = _.map(
      _.filter(this.scope_.lines, function(line) { return line.alive; }),
      function(line) { return line.currentText; }).join('\n');
};


/**
 * Removes a regular expression.
 * @param {!Regex} regex The regex to be removed.
 */
RegexWorksCtrl.prototype.removeRegex = function(regex) {
  var ix = this.scope_.regexes.indexOf(regex);
  if (ix != -1) {
    this.scope_.regexes.splice(ix, 1);
  }
};


/**
 * Adds a new regular expression to the list (at the end).
 */
RegexWorksCtrl.prototype.addNewRegex = function() {
  this.scope_.regexes.push({
    kind: RegexKind.MATCH,
    enabled: true,
    caseSensitive: false,
    globalReplace: true,
    regex: '',
    replacement: '',
    id: this.regexId_++
  });
};


/**
 * Moves an existing regular expression earlier or later (left or right)
 * in the execution queue.
 * @param {!Regex} regex The regex to be moved.
 * @param {boolean} later Whether to move it later (right) or not.
 */
RegexWorksCtrl.prototype.moveRegex = function(regex, later) {
  var ix = this.scope_.regexes.indexOf(regex);
  if (ix == -1) {
    return;
  }
  if (later) {
    if (ix < this.scope_.regexes.length - 1) {
      this.scope_.regexes.splice(ix, 1);
      this.scope_.regexes.splice(ix + 1, 0, regex);
    }
  } else {
    if (ix > 0) {
      this.scope_.regexes.splice(ix, 1);
      this.scope_.regexes.splice(ix - 1, 0, regex);
    }
  }
};


/**
 * Gets a tooltip to use for a regex status light.
 * @param {!Object} regexStatus The status struct for that regex.
 * @param {boolean} title Whether this is for a regex title or body.
 */
RegexWorksCtrl.prototype.getRegexStatusTooltip = function(regexStatus, title) {
  if (regexStatus.regex.kind == RegexKind.MATCH) {
    if (title) {
      return regexStatus.matched ? 'Matched' : 'Did Not Match';
    } else {
      return regexStatus.input;
    }
  } else if (regexStatus.regex.kind == RegexKind.REPLACE) {
    if (title) {
      return regexStatus.matched ? 'Transformed' : 'Did Not Transform';
    } else {
      return regexStatus.input + ' → ' + regexStatus.output;
    }
  } else {
    return 'Zidunno ...';
  }
};
