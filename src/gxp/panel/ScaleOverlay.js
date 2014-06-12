/**
 * @include OpenLayers/Control/ScaleLine.js
 * @requires GeoExt/data/ScaleStore.js
 * @requires GeoExt/panel/Map.js
 */

Ext.define('gxp.panel.ScaleOverlay', {
    extend: 'Ext.panel.Panel',
    requires: [
        'Ext.form.ComboBox', 'Ext.Component', 'GeoExt.data.ScaleStore', 'GeoExt.panel.Map'
    ],
    alias: 'widget.gxp_scaleoverlay',
    map: null,
    layout: 'hbox',
    zoomLevelText: "Zoom level",
    initComponent: function() {
        this.callParent(arguments);
        this.cls = 'map-overlay';
        if(this.map) {
            if(this.map instanceof GeoExt.MapPanel) {
                this.map = this.map.map;
            }
            this.bind(this.map);
        }
        this.on("beforedestroy", this.unbind, this);
    },
    addToMapPanel: function(panel) {
        this.on({
            afterrender: function() {
                this.bind(panel.map);
            },
            scope: this
        });
    },
    stopMouseEvents: function(e) {
        e.stopEvent();
    },
    removeFromMapPanel: function(panel) {
        var el = this.getEl();
        el.un("mousedown", this.stopMouseEvents, this);
        el.un("click", this.stopMouseEvents, this);
        this.unbind();
    },
    addScaleLine: function() {
        var scaleLinePanel = Ext.create('Ext.Component', {
            flex: 1,
            autoEl: {
                tag: "div",
                cls: "olControlScaleLine overlay-element overlay-scaleline"
            }
        });
        this.on("afterlayout", function(){
            scaleLinePanel.getEl().dom.style.position = 'relative';
            scaleLinePanel.getEl().dom.style.display = 'inline';

            this.getEl().on("click", this.stopMouseEvents, this);
            this.getEl().on("mousedown", this.stopMouseEvents, this);
        }, this);
        scaleLinePanel.on('render', function(){
            var scaleLine = new OpenLayers.Control.ScaleLine({
                geodesic: true,
                div: scaleLinePanel.getEl().dom
            });

            this.map.addControl(scaleLine);
            scaleLine.activate();
        }, this);
        this.add(scaleLinePanel);
    },
    handleZoomEnd: function() {
        var scale = this.zoomStore.queryBy(function(record) {
            return this.map.getZoom() == record.data.level;
        }, this);
        if (scale.length > 0) {
            scale = scale.items[0];
            this.zoomSelector.setValue("1 : " + parseInt(scale.data.scale, 10));
        } else {
            if (!this.zoomSelector.rendered) {
                return;
            }
            this.zoomSelector.clearValue();
        }
        this.doLayout();
    },
    addScaleCombo: function() {
        this.zoomStore = Ext.create('GeoExt.data.ScaleStore', {
            map: this.map
        });
        this.zoomSelector = Ext.create('Ext.form.ComboBox', {
            emptyText: this.zoomLevelText,
            listConfig: {
                getInnerTpl: function() {
                    return "1: {scale:round(0)}";
                }
            },
            editable: false,
            triggerAction: 'all',
            queryMode: 'local',
            store: this.zoomStore,
            width: 110
        });
        this.zoomSelector.on({
            click: this.stopMouseEvents,
            mousedown: this.stopMouseEvents,
            select: function(combo, record, index) {
                this.map.zoomTo(record[0].get('level'));
            },
            scope: this
        });
        this.map.events.register('zoomend', this, this.handleZoomEnd);
        var zoomSelectorWrapper = Ext.create('Ext.Panel', {
            items: [this.zoomSelector],
            cls: 'overlay-element overlay-scalechooser',
            border: false
        });
        this.add(zoomSelectorWrapper);
    },
    bind: function(map) {
        this.map = map;
        this.addScaleLine();
        this.addScaleCombo();
        this.doLayout();
    },
    unbind: function() {
        if(this.map && this.map.events) {
            this.map.events.unregister('zoomend', this, this.handleZoomEnd);
        }
        this.zoomStore = null;
        this.zoomSelector = null;
    }
});
