/**
 * @copyright Copyright 2014 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @fileoverview CodeEditorController is an angular controller used to provide
 * a code editor.
 * It allows to edit:
 *    - the JSON model of the selected widget.
 * @author joemu@google.com (Joe Allan Muharsky)
 */

goog.provide('p3rf.perfkit.explorer.components.code_editor.CodeEditorCtrl');

goog.require('p3rf.perfkit.explorer.components.code_editor.CodeEditorMode');
goog.require('p3rf.perfkit.explorer.components.code_editor.CodeEditorSettingsModel');
goog.require('p3rf.perfkit.explorer.components.dashboard.DashboardService');
goog.require('p3rf.perfkit.explorer.components.explorer.ExplorerService');
goog.require('p3rf.perfkit.explorer.components.widget.WidgetFactoryService');
goog.require('p3rf.perfkit.explorer.models.ResultsDataStatus');


goog.scope(function() {
var explorer = p3rf.perfkit.explorer;
var DashboardService = explorer.components.dashboard.DashboardService;
var ExplorerService = explorer.components.explorer.ExplorerService;
var CodeEditorMode = explorer.components.code_editor.CodeEditorMode;
var CodeEditorSettingsModel =
    explorer.components.code_editor.CodeEditorSettingsModel;
var WidgetFactoryService = explorer.components.widget.WidgetFactoryService;
var ResultsDataStatus = explorer.models.ResultsDataStatus;



/**
 * See module docstring for more information about purpose and usage.
 *
 * @param {!angular.Scope} $scope
 * @param {!ExplorerService} explorerService
 * @param {!DashboardService} dashboardService
 * @param {!WidgetFactoryService} widgetFactoryService
 * @constructor
 * @ngInject
 */
explorer.components.code_editor.CodeEditorCtrl = function(
    $scope, explorerService, dashboardService, widgetFactoryService) {
  /**
   * @type {!WidgetFactoryService}
   * @private
   */
  this.widgetFactoryService_ = widgetFactoryService;

  /**
   * @type {!ExplorerService}
   * @export
   */
  this.explorer = explorerService;

  /**
   * @type {!DashboardService}
   * @export
   */
  this.dashboard = dashboardService;

  /**
   * Shortcut property to the code_editor section of the ExplorerSettingsModel.
   * @type {!CodeEditorSettingsModel}
   * @export
   */
  this.settings = this.explorer.model.code_editor;

  /**
   * The currently edited JSON.
   * Note: It is converted to a string to enable text editing from the view.
   *
   * @type {{text: ?string}}
   * @export
   */
  this.currentJson = {text: null};

  /**
   * Stores the current save state.
   * Prevents executing saveToText after executing saveToObject.
   * Because saveToObject changes the current object, the angular watcher is
   * triggered and call saveToText.
   *
   * @type {SaveState}
   */
  this.saveState = SaveState.NONE;

  /**
   * Options for the CodeMirror editor.
   * @type {!Object}
   * @export
   */
  this.editorOptionsJSON = {
    lineWrapping: false,
    lineNumbers: true,
    mode: 'application/json'
  };

  /**
   * Options for the CodeMirror editor.
   * @type {!Object}
   * @export
   */
  this.editorOptionsSQL = {
    lineWrapping: false,
    lineNumbers: true,
    mode: 'text/x-sql'
  };

  /**
   * Error messages raised by this controller.
   *
   * @type {!Array.<string>}
   * @export
   */
  this.errors = [];

  $scope.$watch(
      angular.bind(this, function() {
        if (this.dashboard.selectedWidget) {
          return this.dashboard.selectedWidget.model;
        } else {
          return null;
        }
      }),
      angular.bind(this, this.saveJsonToText), true); // Deep-equality check

  $scope.$watch(
      angular.bind(this, function() { return this.currentJson.text; }),
      angular.bind(this, this.saveTextToJson));

};
var CodeEditorCtrl = explorer.components.code_editor.CodeEditorCtrl;


/**
 * @enum {number}
 */
CodeEditorCtrl.SaveState = {
  NONE: 0,
  SAVING_TO_TEXT: 1,
  SAVING_TO_OBJECT: 2
};
var SaveState = CodeEditorCtrl.SaveState;


/**
 * Opens the code editor.
 * @export
 */
CodeEditorCtrl.prototype.openCodeEditor = function() {
  this.settings.isOpen = true;
  this.saveJsonToText();
  this.saveState = SaveState.NONE;
};


/**
 * Opens the code editor.
 * @export
 */
CodeEditorCtrl.prototype.changeSql = function() {
  if (!this.dashboard.selectedWidget.model.datasource.custom_query) {
    this.explorer.customizeSql(false);
  }
};


/**
 * Opens the code editor, and focuses on the Widget's overall JSON.
 * @export
 */
CodeEditorCtrl.prototype.openWidgetJsonEditor = function() {
  this.settings.selectedMode = CodeEditorMode.JSON;
  this.openCodeEditor();
};


/**
 * Opens the code editor, and focuses on the Query's SQL.
 * @export
 */
CodeEditorCtrl.prototype.editQuerySql = function() {
  this.explorer.model.readOnly = false;
  this.openQuerySqlEditor();
};


/**
 * Opens the code editor, and focuses on the Query's SQL.
 * @export
 */
CodeEditorCtrl.prototype.openQuerySqlEditor = function() {
  this.settings.selectedMode = CodeEditorMode.SQL;
  this.openCodeEditor();
};


/**
 * Closes the code editor.
 * @export
 */
CodeEditorCtrl.prototype.closeCodeEditor = function() {
  this.settings.isOpen = false;
};


/**
 * Converts the current object to JSON and saves it to currentJson.text.
 */
CodeEditorCtrl.prototype.saveJsonToText = function() {
  if (this.saveState === SaveState.SAVING_TO_OBJECT) {
    this.saveState = SaveState.NONE;
  } else {
    var selectedWidget = this.dashboard.selectedWidget;
    this.currentJson.text = selectedWidget ?
        this.widgetFactoryService_.toJson(selectedWidget, true) : null;
    this.saveState = SaveState.SAVING_TO_TEXT;
  }
};


/**
 * Converts currentJson.text to an object and replace the current object with
 * it.
 */
CodeEditorCtrl.prototype.saveTextToJson = function() {
  if (this.saveState === SaveState.SAVING_TO_TEXT) {
    this.saveState = SaveState.NONE;
  } else {
    var selectedWidget = this.dashboard.selectedWidget;
    if (selectedWidget) {
      var newModel;
      try {
        newModel = angular.fromJson(this.currentJson.text);
      } catch (e) {
        // Catch errors when the JSON is invalid
        // TODO: Display error in the UI instead of in the console.
        console.log('json error:', e.message);
      }

      if (newModel) {
        selectedWidget.model = newModel;
        this.saveState = SaveState.SAVING_TO_OBJECT;
      }
    }
  }
};


  /**
   * Returns whether the mode should be enabled.  This is used to disable
   * widget-specific modes (JSON and SQL) when no widget is selected.
   * @param {CodeEditorMode} mode
   * @returns {boolean} True if the mode should be enabled, otherwise False.
   * @export
   */
CodeEditorCtrl.prototype.getModeEnabled = function(mode) {
  switch (mode) {
    case CodeEditorMode.JSON:
    case CodeEditorMode.SQL:
      return (this.dashboard.selectedWidget !== null);
    default:
      return true;
  }
};

});  // goog.scope
