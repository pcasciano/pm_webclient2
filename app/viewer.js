Ext.require([
    'Ext.container.Viewport',
    'GeoExt.slider.Tip',
    'GeoExt.slider.Zoom',
    'gxp.Viewer',
    'gxp.plugins.OLSource',
    'gxp.plugins.WMSSource',
    'gxp.plugins.WMSGetFeatureInfo',
    'gxp.plugins.RemoveLayer',
    'gxp.plugins.LayerTree',
    'gxp.plugins.ZoomToExtent',
    'gxp.plugins.ZoomToLayerExtent',
    'gxp.plugins.Navigation',
    'gxp.plugins.NavigationHistory',
    'gxp.plugins.Zoom',
    'gxp.plugins.Measure',
    'gxp.plugins.AddLayers',
    'gxp.panel.ScaleOverlay',

    'gxp.plugins.FeatureManager',
]);

Ext.application({
    name: 'PM',

    controllers: ['PanelFase1', 'PanelFase2', 'PanelFase3'],

    launch: function() {
	/*var WGS84 = new OpenLayers.Projection("EPSG:4326");
	var SphericMercator = new OpenLayers.Projection("EPSG:3857");
        var c=new OpenLayers.LonLat('12.5', '41.88').transform(WGS84, SphericMercator);
        console.log(c);*/
        Ext.create('gxp.Viewer', {
            portalItems: [{region: 'center', layout: 'border', tbar: {id: 'paneltbar'}, items: ['mymap', {
                region: 'west',
                id: 'west',
                title: "Layers",
                /*layout: 'fit',
                 split: true,*/
		layout: 'accordion',
                width: 250,
		items:[{xtype:'panelFase1'},{xtype:'panelFase2'},{xtype:'panelFase3'}]
            }]}],
            tools: [{
                ptype: "gxp_wmsgetfeatureinfo",
                showButtonText: true,
                outputConfig: {
                    width: 400,
                    height: 200
                },
                toggleGroup: "interaction",
                actionTarget: 'paneltbar'
            },   {
                ptype: "gxp_measure", toggleGroup: "interaction",
                controlOptions: {immediate: true},
                showButtonText: true,
                actionTarget: "paneltbar"
            },

                    //layertree1
                    {
                        ptype: "gxp_layertree",
                        outputConfig: {
                            id: "tree1",
                            autoScroll: true,
                            border: false,
                            tbar: [] // we will add buttons to "tree.bbar" later
                        },
                        outputTarget: "fase1"
                    },
                    {
                        ptype: "gxp_zoomtolayerextent",
                        actionTarget: ["tree1.contextMenu"]
                    },

                    //layertree3
                    {
                        ptype: "gxp_layertree",
                        outputConfig: {
                            id: "tree3",
                            autoScroll: true,
                            border: false,
                            tbar: [] // we will add buttons to "tree.bbar" later
                        },
                        outputTarget: "fase3"
                    }, {
                        ptype: "gxp_addlayers",
                        actionTarget: "tree3.tbar",
                        outputTarget: "tree3"
                    }, {
                        ptype: "gxp_removelayer",
                        actionTarget: ["tree3.tbar", "tree3.contextMenu"]
                    }, {
                        ptype: "gxp_zoomtolayerextent",
                        actionTarget: ["tree3.contextMenu"]
                    },
///////////////////////////////end layertrees


                    {
                        ptype: "gxp_navigation",
                        toggleGroup: "navigation"
                    }, {
                        ptype: "gxp_zoom",
                        toggleGroup: "navigation",
                        showZoomBoxAction: true,
                        controlOptions: {zoomOnClick: false}
                    }, {
                        ptype: "gxp_navigationhistory"
                    }, {
                        ptype: "gxp_zoomtoextent"
                    }/*,{
                        ptype: 'gxp_featuremanager',
                        paging: false,
                        id: 'fase1_manager',
                        layer:{
                            source: 'ol',
                            name: 'divater'

                        }
                    }*/
                   ,{

                   }],
            sources: {
                ol: {
                    ptype: "gxp_olsource"
                },
                wms: {
                    ptype: "gxp_wmssource",
                    url: "http://89.31.77.165/geoserver/divater/wms",
                    version: "1.1.1"
                }
            },
            map: {
                id: 'mymap',
                region: 'center',

                title: "Map",
                projection: "EPSG:900913",
                units: "m",
                maxExtent: [-20037508.34, -20037508.34, 20037508.34, 20037508.34],
                center:[1391493.634722222,5143020.939952482], //Rome
                zoom: 11,
                layers: [ {
                    source: "ol",
                    type: "OpenLayers.Layer.WMS",
                    args: ["OpenStreetMap", "http://maps.opengeo.org/geowebcache/service/wms",
                           {layers: 'openstreetmap', format: 'image/png'}],
                    group: "background"
                },{
                    source: "ol",
                    type: "OpenLayers.Layer.WMS",
                    args: ["Blue marble", "http://maps.opengeo.org/geowebcache/service/wms",
                           {layers: 'bluemarble'}],
                    group: "background"
                },{
                    /*source: 'wms',
                    title: 'divater fase 1',
                    name:'divater:pm_phase2',
                    transparent:true,
                    queryable: true,
                    selected: true,*/
                    source: 'ol',
                    type: 'OpenLayers.Layer.WMS',
                    args:['divater fase 1', 'http://89.31.77.165/geoserver/divater/wms',
                          {layers: 'divater:pm_phase1', transparent: true}],
                    group: 'overlays'

                }/*, {
                  source: "local",
                  name: "usa:states",
                  title: "States, USA - Population",
                  bbox: [-13884991.404203, 2870341.1822503, -7455066.2973878, 6338219.3590349],
                  queryable: true,
                  selected: true
                  }*/],
                items: [{
                    xtype: "gxp_scaleoverlay"
                }, {
                    xtype: "gx_zoomslider",
                    vertical: true,
                    height: 100,
                    maxHeight: 100,
                    plugins: Ext.create('GeoExt.slider.Tip', {
                        getText: function(thumb) {
                            return Ext.String.format(
                                '<div>Zoom Level: {0}</div><div>Scale: 1:{1}</div>',
                                thumb.slider.getZoom(),
                                thumb.slider.getScale()
                            );
                        }
                    })
                }]
            }
        });
    }
});
