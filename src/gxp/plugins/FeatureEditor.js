/**
 * @requires plugins/ClickableFeatures.js
 * @requires window/FeatureEditPopup.js
 * @requires util.js
 * @requires OpenLayers/Control/DrawFeature.js
 * @requires OpenLayers/Handler/Point.js
 * @requires OpenLayers/Handler/Path.js
 * @requires OpenLayers/Handler/Polygon.js
 * @requires OpenLayers/Control/SelectFeature.js
 * @requires GeoExt/Form.js
 */

Ext.define('gxp.plugins.FeatureEditor', {
    extend: 'gxp.plugins.ClickableFeatures',
    alias: 'plugin.gxp_featureeditor',
    requires: [
        'gxp.window.FeatureEditPopup',
        'GeoExt.Form'
    ],
    commitMessage: false,
    splitButton: null,
    iconClsAdd: "gxp-icon-addfeature",
    closeOnSave: false,
    supportAbstractGeometry: false,
    supportNoGeometry: false,
    iconClsEdit: "gxp-icon-editfeature",
    exceptionTitle: "Save Failed",
    exceptionText: "Trouble saving features",
    pointText: "Point",
    lineText: "Line",
    polygonText: "Polygon",
    noGeometryText: "Event",
    commitTitle: "Commit message",
    commitText: "Please enter a commit message for this edit:",
    createFeatureActionTip: "Create a new feature",
    createFeatureActionText: "Create",
    editFeatureActionTip: "Edit existing feature",
    editFeatureActionText: "Modify",
    splitButtonText: "Edit",
    splitButtonTooltip: "Edit features on selected WMS layer",
    outputTarget: "map",
    snappingAgent: null,
    readOnly: false,
    modifyOnly: false,
    showSelectedOnly: true,
    roles: ["ROLE_ADMINISTRATOR"],
    createAction: null,
    editAction: null,
    activeIndex: 0,
    drawControl: null,
    popup: null,
    schema: null,
    constructor: function(config) {
        this.addEvents(
            "layereditable",
            "featureeditable"
        );
        this.callParent(arguments);
    },
    init: function(target) {
        this.callParent(arguments);
        this.target.on("authorizationchange", this.onAuthorizationChange, this);
    },
    destroy: function() {
        this.target.un("authorizationchange", this.onAuthorizationChange, this);
        this.callParent(arguments);
    },
    onAuthorizationChange: function() {
        if (!this.target.isAuthorized(this.roles)) {
            //TODO if a popup is open, this won't take care of closing it when
            // a user logs out.
            this.selectControl.deactivate();
            this.drawControl.deactivate();
        }
        // we don't want to return false here, otherwise we would abort the
        // event chain.
        this.enableOrDisable();
    },
    addActions: function() {
        var popup;
        var featureManager = this.getFeatureManager();
        var featureLayer = featureManager.featureLayer;

        var intercepting = false;
        // intercept calls to methods that change the feature store - allows us
        // to persist unsaved changes before calling the original function
        function intercept(mgr, fn) {
            var fnArgs = Array.prototype.slice.call(arguments);
            // remove mgr and fn, which will leave us with the original
            // arguments of the intercepted loadFeatures or setLayer function
            fnArgs.splice(0, 2);
            if (!intercepting && popup && !popup.isDestroyed) {
                if (popup.editing) {
                    function doIt() {
                        intercepting = true;
                        unregisterDoIt.call(this);
                        if (fn === "setLayer") {
                            this.target.selectLayer(fnArgs[0]);
                        } else if (fn === "clearFeatures") {
                            // nothing asynchronous involved here, so let's
                            // finish the caller first before we do anything.
                            window.setTimeout(function() {mgr[fn].call(mgr);});
                        } else {
                            mgr[fn].apply(mgr, fnArgs);
                        }
                    }
                    function unregisterDoIt() {
                        featureManager.featureStore.un("write", doIt, this);
                        popup.un("canceledit", doIt, this);
                        popup.un("cancelclose", unregisterDoIt, this);
                    }
                    featureManager.featureStore.on("write", doIt, this);
                    popup.on({
                        canceledit: doIt,
                        cancelclose: unregisterDoIt,
                        scope: this
                    });
                    popup.close();
                }
                return !popup.editing;
            }
            intercepting = false;
        }
        featureManager.on({
            // TODO: determine where these events should be unregistered
            "beforequery": Ext.bind(intercept, this, ["loadFeatures"], 1),
            "beforelayerchange": Ext.bind(intercept, this, ["setLayer"], 1),
            "beforesetpage": Ext.bind(intercept, this, ["setPage"], 1),
            "beforeclearfeatures": Ext.bind(intercept, this, ["clearFeatures"], 1),
            scope: this
        });

        this.drawControl = new OpenLayers.Control.DrawFeature(
            featureLayer,
            OpenLayers.Handler.Point,
            {
                eventListeners: {
                    featureadded: function(evt) {
                        if (this.autoLoadFeature === true) {
                            this.autoLoadedFeature = evt.feature;
                        }
                    },
                    activate: function() {
                        this.target.doAuthorized(this.roles, function() {
                            featureManager.showLayer(
                                this.id, this.showSelectedOnly && "selected"
                            );
                        }, this);
                    },
                    deactivate: function() {
                        featureManager.hideLayer(this.id);
                    },
                    scope: this
                }
            }
        );
        // create a SelectFeature control
        // "fakeKey" will be ignord by the SelectFeature control, so only one
        // feature can be selected by clicking on the map, but allow for
        // multiple selection in the featureGrid
        this.selectControl = new OpenLayers.Control.SelectFeature(featureLayer, {
            clickout: false,
            multipleKey: "fakeKey",
            eventListeners: {
                "activate": function() {
                    this.target.doAuthorized(this.roles, function() {
                        if (this.autoLoadFeature === true || featureManager.paging) {
                            this.target.mapPanel.map.events.register(
                                "click", this, this.noFeatureClick
                            );
                        }
                        featureManager.showLayer(
                            this.id, this.showSelectedOnly && "selected"
                        );
                        this.selectControl.unselectAll(
                            popup && popup.editing && {except: popup.feature}
                        );
                    }, this);
                },
                "deactivate": function() {
                    if (this.autoLoadFeature === true || featureManager.paging) {
                        this.target.mapPanel.map.events.unregister(
                            "click", this, this.noFeatureClick
                        );
                    }
                    if (popup) {
                        if (popup.editing) {
                            popup.on("cancelclose", function() {
                                this.selectControl.activate();
                            }, this, {single: true});
                        }
                        popup.on("close", function() {
                            featureManager.hideLayer(this.id);
                        }, this, {single: true});
                        popup.close();
                    } else {
                        featureManager.hideLayer(this.id);
                    }
                },
                scope: this
            }
        });
        featureLayer.events.on({
            "beforefeatureremoved": function(evt) {
                if (this.popup && evt.feature === this.popup.feature) {
                    this.selectControl.unselect(evt.feature);
                }
            },
            "featureunselected": function(evt) {
                var feature = evt.feature;
                if (feature) {
                    this.fireEvent("featureeditable", this, feature, false);
                }
                if (feature && feature.geometry && popup && !popup.hidden) {
                    popup.close();
                }
            },
            "beforefeatureselected": function(evt) {
                //TODO decide if we want to allow feature selection while a
                // feature is being edited. If so, we have to revisit the
                // SelectFeature/ModifyFeature setup, because that would
                // require to have the SelectFeature control *always*
                // activated *after* the ModifyFeature control. Otherwise. we
                // must not configure the ModifyFeature control in standalone
                // mode, and use the SelectFeature control that comes with the
                // ModifyFeature control instead.
                if(popup) {
                    return !popup.editing;
                }
            },
            "featureselected": function(evt) {
                var feature = evt.feature;
                if (feature) {
                    this.fireEvent("featureeditable", this, feature, true);
                }
                var featureStore = featureManager.featureStore;
                if(this._forcePopupForNoGeometry === true || (this.selectControl.active && feature.geometry !== null)) {
                    // deactivate select control so no other features can be
                    // selected until the popup is closed
                    if (this.readOnly === false) {
                        this.selectControl.deactivate();
                        // deactivate will hide the layer, so show it again
                        featureManager.showLayer(this.id, this.showSelectedOnly && "selected");
                    }
                    popup = this.addOutput({
                        xtype: "gxp_featureeditpopup",
                        collapsible: true,
                        feature: featureStore.getByFeature(feature),
                        vertexRenderIntent: "vertex",
                        readOnly: this.readOnly,
                        fields: this.fields,
                        excludeFields: this.excludeFields,
                        editing: feature.state === OpenLayers.State.INSERT,
                        schema: this.schema,
                        allowDelete: true,
                        width: 200,
                        height: 250
                    });
                    popup.on({
                        "close": function() {
                            if (this.readOnly === false) {
                                this.selectControl.activate();
                            }
                            if(feature.layer && feature.layer.selectedFeatures.indexOf(feature) !== -1) {
                                this.selectControl.unselect(feature);
                            }
                            if (feature === this.autoLoadedFeature) {
                                if (feature.layer) {
                                    feature.layer.removeFeatures([evt.feature]);
                                }
                                this.autoLoadedFeature = null;
                            }
                        },
                        "featuremodified": function(popup, feature) {
                            featureStore.getByFeature(feature).setDirty();
                            featureStore.on({
                                beforewrite: {
                                    fn: function(store, action, rs, options) {
                                        if (this.commitMessage === true) {
                                            options.params.handle = this._commitMsg;
                                            delete this._commitMsg;
                                        }
                                    },
                                    single: true
                                },
                                beforesave: {
                                    fn: function() {
                                        if (popup && popup.isVisible()) {
                                            popup.disable();
                                        }
                                        if (this.commitMessage === true) {
                                            if (!this._commitMsg) {
                                                var fn = arguments.callee;
                                                Ext.Msg.show({
                                                    prompt: true,
                                                    title: this.commitTitle,
                                                    msg: this.commitText,
                                                    buttons: Ext.Msg.OK,
                                                    fn: function(btn, text) {
                                                        if (btn === 'ok') {
                                                            this._commitMsg = text;
                                                            featureStore.un('beforesave', fn, this);
                                                            featureStore.save();
                                                        }
                                                    },
                                                    scope: this,
                                                    multiline: true
                                                });
                                                return false;
                                            }
                                        }
                                    },
                                    single: this.commitMessage !== true
                                },
                                write: {
                                    fn: function() {
                                        if (popup) {
                                            if (popup.isVisible()) {
                                                popup.enable();
                                            }
                                            if (this.closeOnSave) {
                                                popup.close();
                                            }
                                        }
                                        var layer = featureManager.layerRecord;
                                        this.target.fireEvent("featureedit", featureManager, {
                                            name: layer.get("name"),
                                            source: layer.get("source")
                                        });
                                    },
                                    single: true
                                },
                                exception: {
                                    fn: function(proxy, type, action, options, response, records) {
                                        var msg = this.exceptionText;
                                        if (type === "remote") {
                                            // response is service exception
                                            if (response.exceptionReport) {
                                                msg = gxp.util.getOGCExceptionText(response.exceptionReport);
                                            }
                                        } else {
                                            // non-200 response from server
                                            msg = "Status: " + response.status;
                                        }
                                        // fire an event on the feature manager
                                        featureManager.fireEvent("exception", featureManager,
                                            response.exceptionReport || {}, msg, records);
                                        // only show dialog if there is no listener registered
                                        if (featureManager.hasListener("exception") === false &&
                                            featureStore.hasListener("exception") === false) {
                                                Ext.Msg.show({
                                                    title: this.exceptionTitle,
                                                    msg: msg,
                                                    icon: Ext.MessageBox.ERROR,
                                                    buttons: {ok: true}
                                                });
                                        }
                                        if (popup && popup.isVisible()) {
                                            popup.enable();
                                            popup.startEditing();
                                        }
                                    },
                                    single: true
                                },
                                scope: this
                            });
                            if(feature.state === OpenLayers.State.DELETE) {
                                /**
                                 * If the feature state is delete, we need to
                                 * remove it from the store (so it is collected
                                 * in the store.removed list.  However, it should
                                 * not be removed from the layer.  Until
                                 * http://trac.geoext.org/ticket/141 is addressed
                                 * we need to stop the store from removing the
                                 * feature from the layer.
                                 */
                                featureStore._removing = true; // TODO: remove after http://trac.geoext.org/ticket/141
                                featureStore.remove(featureStore.getByFeature(feature));
                                delete featureStore._removing; // TODO: remove after http://trac.geoext.org/ticket/141
                            }
                            featureStore.save();
                        },
                        "canceledit": function(popup, feature) {
                            featureStore.commitChanges();
                        },
                        scope: this
                    });
                    this.popup = popup;
                }
            },
            "sketchcomplete": function(evt) {
                // Why not register for featuresadded directly? We only want
                // to handle features here that were just added by a
                // DrawFeature control, and we need to make sure that our
                // featuresadded handler is executed after any FeatureStore's,
                // because otherwise our selectControl.select statement inside
                // this handler would trigger a featureselected event before
                // the feature row is added to a FeatureGrid. This, again,
                // would result in the new feature not being shown as selected
                // in the grid.
                featureManager.featureLayer.events.register("featuresadded", this, function(evt) {
                    featureManager.featureLayer.events.unregister("featuresadded", this, arguments.callee);
                    this.drawControl.deactivate();
                    this.selectControl.activate();
                    this.selectControl.select(evt.features[0]);
                });
            },
            scope: this
        });
        var toggleGroup = this.toggleGroup || Ext.id();

        var actions = [];
        var commonOptions = {
            tooltip: this.createFeatureActionTip,
            text: this.initialConfig.createFeatureActionText,
            iconCls: this.iconClsAdd,
            disabled: true,
            hidden: this.modifyOnly || this.readOnly,
            toggleGroup: toggleGroup,
            //TODO Tool.js sets group, but this doesn't work for GeoExt.Action
            group: toggleGroup,
            groupClass: null,
            enableToggle: true,
            allowDepress: true,
            control: this.drawControl,
            deactivateOnDisable: true,
            map: this.target.mapPanel.map,
            listeners: {checkchange: this.onItemCheckchange, scope: this}
        };
        if (this.supportAbstractGeometry === true) {
            var menuItems = [];
            if (this.supportNoGeometry === true) {
                menuItems.push(
                    new Ext.menu.CheckItem({
                        text: this.noGeometryText,
                        iconCls: "gxp-icon-event",
                        groupClass: null,
                        group: toggleGroup,
                        listeners: {
                            checkchange: function(item, checked) {
                                if (checked === true) {
                                    var feature = new OpenLayers.Feature.Vector(null);
                                    feature.state = OpenLayers.State.INSERT;
                                    featureLayer.addFeatures([feature]);
                                    this._forcePopupForNoGeometry = true;
                                    featureLayer.events.triggerEvent("featureselected", {feature: feature});
                                    delete this._forcePopupForNoGeometry;
                                }
                                if (this.createAction.items[0] instanceof Ext.menu.CheckItem) {
                                    this.createAction.items[0].setChecked(false);
                                } else {
                                    this.createAction.items[0].toggle(false);
                                }
                            },
                            scope: this
                        }
                    })
                );
            }
            var checkChange = function(item, checked, Handler) {
                if (checked === true) {
                    this.setHandler(Handler, false);
                }
                if (this.createAction.items[0] instanceof Ext.menu.CheckItem) {
                    this.createAction.items[0].setChecked(checked);
                } else {
                    this.createAction.items[0].toggle(checked);
                }
            };
            menuItems.push(
                new Ext.menu.CheckItem({
                    groupClass: null,
                    text: this.pointText,
                    group: toggleGroup,
                    iconCls: 'gxp-icon-point',
                    listeners: {
                        checkchange: Ext.bind(checkChange, this, [OpenLayers.Handler.Point], 2)
                    }
                }),
                new Ext.menu.CheckItem({
                    groupClass: null,
                    text: this.lineText,
                    group: toggleGroup,
                    iconCls: 'gxp-icon-line',
                    listeners: {
                        checkchange: Ext.bind(checkChange, this, [OpenLayers.Handler.Path], 2)
                    }
                }),
                new Ext.menu.CheckItem({
                    groupClass: null,
                    text: this.polygonText,
                    group: toggleGroup,
                    iconCls: 'gxp-icon-polygon',
                    listeners: {
                        checkchange: Ext.bind(checkChange, this, [OpenLayers.Handler.Polygon], 2)
                    }
                })
            );

            actions.push(
                new GeoExt.Action(Ext.apply(commonOptions, {
                    menu: new Ext.menu.Menu({items: menuItems})
                }))
            );
        } else {
            actions.push(new GeoExt.Action(commonOptions));
        }
        actions.push(new GeoExt.Action({
            tooltip: this.initialConfig.editFeatureActionTip,
            text: this.editFeatureActionText,
            iconCls: this.iconClsEdit,
            disabled: true,
            toggleGroup: toggleGroup,
            //TODO Tool.js sets group, but this doesn't work for GeoExt.Action
            group: toggleGroup,
            groupClass: null,
            enableToggle: true,
            allowDepress: true,
            control: this.selectControl,
            deactivateOnDisable: true,
            map: this.target.mapPanel.map,
            listeners: {checkchange: this.onItemCheckchange, scope: this}
        }));

        this.createAction = actions[0];
        this.editAction = actions[1];
        if (this.splitButton) {
            this.splitButton = new Ext.SplitButton({
                menu: {items: [
                    Ext.apply(new Ext.menu.CheckItem(actions[0]), {
                        text: this.createFeatureActionText
                    }),
                    Ext.apply(new Ext.menu.CheckItem(actions[1]), {
                        text: this.editFeatureActionText
                    })
                ]},
                disabled: true,
                text: this.splitButtonText,
                tooltip: this.splitButtonTooltip,
                iconCls: this.iconClsAdd,
                enableToggle: true,
                toggleGroup: this.toggleGroup,
                allowDepress: true,
                handler: function(button, event) {
                    if(button.pressed) {
                        button.menu.items.get(this.activeIndex).setChecked(true);
                    }
                },
                scope: this,
                listeners: {
                    toggle: function(button, pressed) {
                        // toggleGroup should handle this
                        if(!pressed) {
                            button.menu.items.each(function(i) {
                                i.setChecked(false);
                            });
                        }
                    }
                }
            });
            actions = [this.splitButton];
        }
        actions = gxp.plugins.FeatureEditor.superclass.addActions.call(this, actions);

        featureManager.on("layerchange", this.onLayerChange, this);

        var snappingAgent = this.getSnappingAgent();
        if (snappingAgent) {
            snappingAgent.registerEditor(this);
        }

        return actions;
    },
    onItemCheckchange: function(item, checked) {
        if (this.splitButton) {
            this.activeIndex = item.ownerCt.items.indexOf(item);
            this.splitButton.toggle(checked);
            if (checked) {
                this.splitButton.setIconCls(item.iconCls);
            }
        }
    },
    getFeatureManager: function() {
        var manager = this.target.tools[this.featureManager];
        if (!manager) {
            throw new Error("Unable to access feature manager by id: " + this.featureManager);
        }
        return manager;
    },
    getSnappingAgent: function() {
        var agent;
        var snapId = this.snappingAgent;
        if (snapId) {
            agent = this.target.tools[snapId];
            if (!agent) {
                throw new Error("Unable to locate snapping agent with id: " + snapId);
            }
        }
        return agent;
    },
    setHandler: function(Handler, multi) {
        var control = this.drawControl;
        var active = control.active;
        if(active) {
            control.deactivate();
        }
        control.handler.destroy();
        control.handler = new Handler(
            control, control.callbacks,
            Ext.apply(control.handlerOptions, {multi: multi})
        );
        if(active) {
            control.activate();
        }
    },
    enableOrDisable: function() {
        // disable editing if no schema
        var disable = !this.schema;
        if (this.splitButton) {
            this.splitButton.setDisabled(disable);
        }
        this.createAction.setDisabled(disable);
        this.editAction.setDisabled(disable);
        return disable;
    },
    onLayerChange: function(mgr, layer, schema) {
        this.schema = schema;
        var disable = this.enableOrDisable();
        if (disable) {
            // not a wfs capable layer
            this.fireEvent("layereditable", this, layer, false);
            return;
        }

        var control = this.drawControl;
        var button = this.createAction;
        var handlers = {
            "Point": OpenLayers.Handler.Point,
            "Line": OpenLayers.Handler.Path,
            "Curve": OpenLayers.Handler.Path,
            "Polygon": OpenLayers.Handler.Polygon,
            "Surface": OpenLayers.Handler.Polygon
        };
        var simpleType = mgr.geometryType && mgr.geometryType.replace("Multi", "");
        var Handler = simpleType && handlers[simpleType];
        if (Handler) {
            var multi = (simpleType != mgr.geometryType);
            this.setHandler(Handler, multi);
            button.enable();
        } else if (this.supportAbstractGeometry === true && mgr.geometryType && mgr.geometryType === 'Geometry') {
            button.enable();
        } else {
            button.disable();
        }
        this.fireEvent("layereditable", this, layer, true);
    },
    select: function(feature) {
        this.selectControl.unselectAll(
            this.popup && this.popup.editing && {except: this.popup.feature});
        this.selectControl.select(feature);
    }
});

