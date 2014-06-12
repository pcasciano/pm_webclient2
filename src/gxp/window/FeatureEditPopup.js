/**
 * @requires grid/FeatureEditor.js
 * @requires GeoExt/window/Popup.js
 * @requires OpenLayers/Control/ModifyFeature.js
 */

Ext.define('gxp.window.FeatureEditPopup', {
    extend: 'GeoExt.window.Popup',
    alias: 'widget.gxp_featureeditpopup',
    closeMsgTitle: 'Save Changes?',
    closeMsg: 'This feature has unsaved changes. Would you like to save your changes?',
    deleteMsgTitle: 'Delete Feature?',
    deleteMsg: 'Are you sure you want to delete this feature?',
    editButtonText: 'Edit',
    editButtonTooltip: 'Make this feature editable',
    deleteButtonText: 'Delete',
    deleteButtonTooltip: 'Delete this feature',
    cancelButtonText: 'Cancel',
    cancelButtonTooltip: 'Stop editing, discard changes',
    saveButtonText: 'Save',
    saveButtonTooltip: 'Save changes',
    layout: "fit",
    feature: null,
    schema: null,
    readOnly: false,
    allowDelete: false,
    editing: false,
    editorPluginConfig: {
        ptype: "gxp_editorgrid"
    },
    modifyControl: null,
    geometry: null,
    attributes: null,
    cancelButton: null,
    saveButton: null,
    editButton: null,
    deleteButton: null,
    initComponent: function() {
        this.addEvents(

            /** api: events[startedit]
             *  Fires when editing starts.
             *
             *  Listener arguments:
             *  * panel - :class:`gxp.FeatureEditPopup` This popup.
             */
            "startedit",

            /** api: events[stopedit]
             *  Fires when editing stops.
             *
             *  Listener arguments:
             *  * panel - :class:`gxp.FeatureEditPopup` This popup.
             */
            "stopedit",

            /** api: events[beforefeaturemodified]
             *  Fires before the feature associated with this popup has been
             *  modified (i.e. when the user clicks "Save" on the popup).
             *
             *  Listener arguments:
             *  * panel - :class:`gxp.FeatureEditPopup` This popup.
             *  * feature - ``OpenLayers.Feature`` The modified feature.
             */
            "beforefeaturemodified",

            /** api: events[featuremodified]
             *  Fires when the feature associated with this popup has been
             *  modified (i.e. when the user clicks "Save" on the popup) or
             *  deleted (i.e. when the user clicks "Delete" on the popup).
             *
             *  Listener arguments:
             *  * panel - :class:`gxp.FeatureEditPopup` This popup.
             *  * feature - ``OpenLayers.Feature`` The modified feature.
             */
            "featuremodified",

            /** api: events[canceledit]
             *  Fires when the user exits the editing mode by pressing the
             *  "Cancel" button or selecting "No" in the popup's close dialog.
             *
             *  Listener arguments:
             *  * panel - :class:`gxp.FeatureEditPopup` This popup.
             *  * feature - ``OpenLayers.Feature`` The feature. Will be null
             *    if editing of a feature that was just inserted was cancelled.
             */
            "canceledit",

            /** api: events[cancelclose]
             *  Fires when the user answers "Cancel" to the dialog that
             *  appears when a popup with unsaved changes is closed.
             *
             *  Listener arguments:
             *  * panel - :class:`gxp.FeatureEditPopup` This popup.
             */
            "cancelclose"
        );

        var feature = this.feature;
        if (feature instanceof Ext.data.Model) {
            feature = this.feature = feature.raw;
        }
        if (!this.location) {
            this.location = feature;
        }

        this.anchored = !this.editing;

        if(!this.title && feature.fid) {
            this.title = feature.fid;
        }

        this.editButton = new Ext.Button({
            text: this.editButtonText,
            tooltip: this.editButtonTooltip,
            iconCls: "edit",
            handler: this.startEditing,
            scope: this
        });

        this.deleteButton = new Ext.Button({
            text: this.deleteButtonText,
            tooltip: this.deleteButtonTooltip,
            iconCls: "delete",
            hidden: !this.allowDelete,
            handler: this.deleteFeature,
            scope: this
        });

        this.cancelButton = new Ext.Button({
            text: this.cancelButtonText,
            tooltip: this.cancelButtonTooltip,
            iconCls: "cancel",
            hidden: true,
            handler: function() {
                this.stopEditing(false);
            },
            scope: this
        });


        this.saveButton = new Ext.Button({
            text: this.saveButtonText,
            tooltip: this.saveButtonTooltip,
            iconCls: "save",
            hidden: true,
            handler: function() {
                this.stopEditing(true);
            },
            scope: this
        });

        this.plugins = [Ext.apply({
            feature: feature,
            schema: this.schema,
            fields: this.fields,
            excludeFields: this.excludeFields,
            propertyNames: this.propertyNames,
            readOnly: this.readOnly
        }, this.editorPluginConfig)];

        this.bbar = new Ext.Toolbar({
            hidden: this.readOnly,
            items: [
                this.editButton,
                this.deleteButton,
                this.saveButton,
                this.cancelButton
            ]
        });

        this.callParent(arguments);

        this.on({
            "show": function() {
                if(this.editing) {
                    this.editing = null;
                    this.startEditing();
                }
            },
            "beforeclose": function() {
                if(!this.editing) {
                    return;
                }
                if(this.feature.state === this.getDirtyState()) {
                    Ext.Msg.show({
                        title: this.closeMsgTitle,
                        msg: this.closeMsg,
                        buttons: Ext.Msg.YESNOCANCEL,
                        fn: function(button) {
                            if(button && button !== "cancel") {
                                this.stopEditing(button === "yes");
                                this.close();
                            } else {
                                this.fireEvent("cancelclose", this);
                            }
                        },
                        scope: this,
                        icon: Ext.MessageBox.QUESTION,
                        animEl: this.getEl()
                    });
                    return false;
                } else {
                    this.stopEditing(false);
                }
            },
            scope: this
        });
    },
    getDirtyState: function() {
        return this.feature.state === OpenLayers.State.INSERT ?
            this.feature.state : OpenLayers.State.UPDATE;
    },
    startEditing: function() {
        if(!this.editing) {
            this.fireEvent("startedit", this);
            this.editing = true;
            this.anc && this.unanchorPopup();

            this.editButton.hide();
            this.deleteButton.hide();
            this.saveButton.show();
            this.cancelButton.show();

            this.geometry = this.feature.geometry && this.feature.geometry.clone();
            this.attributes = Ext.apply({}, this.feature.attributes);

            this.modifyControl = new OpenLayers.Control.ModifyFeature(
                this.feature.layer,
                {standalone: true, vertexRenderIntent: this.vertexRenderIntent}
            );
            this.feature.layer.map.addControl(this.modifyControl);
            this.modifyControl.activate();
            if (this.feature.geometry) {
                this.modifyControl.selectFeature(this.feature);
            }
        }
    },
    stopEditing: function(save) {
        if(this.editing) {
            this.fireEvent("stopedit", this);
            //TODO remove the line below when
            // http://trac.openlayers.org/ticket/2210 is fixed.
            this.modifyControl.deactivate();
            this.modifyControl.destroy();

            var feature = this.feature;
            if (feature.state === this.getDirtyState()) {
                if (save === true) {
                    this.fireEvent("beforefeaturemodified", this, feature);
                    //TODO When http://trac.osgeo.org/openlayers/ticket/3131
                    // is resolved, remove the if clause below
                    if (this.schema) {
                        var attribute, rec;
                        for (var i in feature.attributes) {
                            rec = this.schema.getAt(this.schema.findExact("name", i));
                            attribute = feature.attributes[i];
                            if (attribute instanceof Date) {
                                var type = rec.get("type").split(":").pop();
                                feature.attributes[i] = attribute.format(
                                    type == "date" ? "Y-m-d" : "c"
                                );
                            }
                        }
                    }
                    this.fireEvent("featuremodified", this, feature);
                } else if(feature.state === OpenLayers.State.INSERT) {
                    this.editing = false;
                    feature.layer && feature.layer.destroyFeatures([feature]);
                    this.fireEvent("canceledit", this, null);
                    this.close();
                } else {
                    var layer = feature.layer;
                    layer.drawFeature(feature, {display: "none"});
                    feature.geometry = this.geometry;
                    feature.attributes = this.attributes;
                    this.setFeatureState(null);
                    layer.drawFeature(feature);
                    this.fireEvent("canceledit", this, feature);
                }
            }

            if (!this.isDestroyed) {
                this.cancelButton.hide();
                this.saveButton.hide();
                this.editButton.show();
                this.allowDelete && this.deleteButton.show();
            }

            this.editing = false;
        }
    },
    deleteFeature: function() {
        Ext.Msg.show({
            title: this.deleteMsgTitle,
            msg: this.deleteMsg,
            buttons: Ext.Msg.YESNO,
            fn: function(button) {
                if(button === "yes") {
                    this.setFeatureState(OpenLayers.State.DELETE);
                    this.fireEvent("featuremodified", this, this.feature);
                    this.close();
                }
            },
            scope: this,
            icon: Ext.MessageBox.QUESTION,
            animEl: this.getEl()
        });
    },
    setFeatureState: function(state) {
        this.feature.state = state;
        var layer = this.feature.layer;
        layer && layer.events.triggerEvent("featuremodified", {
            feature: this.feature
        });
    }
});
