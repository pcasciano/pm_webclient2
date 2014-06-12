/*Ext.require(['Ext.form.FieldSet',
 'Ext.form.field.*',
 'Ext.data.*',
 'GeoExt.Action',
 'PM.view.CustomLayerTree'

 //	     'gxp.plugins.LayerTree'

 ]);
 */

Ext.define('PM.view.PanelFase2', {
    extend: 'Ext.panel.Panel',
    alias : 'widget.panelFase2',

    title: 'Fase 2',
    //   bodyPadding: 5,
    //   autoScroll: true,
    items:[
	/*{
	 xtype: 'panel',
	 title: '<i class="fa fa-folder-open"></i> Layers',
	 items:[{
	 xtype: 'fieldset',
	 id: 'layers-div',
	 padding: '5px'
	 }]
	 },*/
        {
           xtype: 'container',
            id: 'fase2'

        },
	{
	    xtype:'button',
	    text: '<i class="fa fa-comment"></i> Invia standard report',
	    tooltip: "Invia gli elementi selezionati",
	    handler: function() {
		if (getSelectedFeaturesCount()==0) {
		    alert("Nessun elemento selezionato!");
		}
		else {
		    showSelectedForm(2);
		}
	    }
	}
    ]
});
