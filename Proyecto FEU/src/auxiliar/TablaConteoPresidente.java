package auxiliar;

import javax.swing.table.DefaultTableModel;

import logica.Candidato;

public class TablaConteoPresidente extends DefaultTableModel{

	private static final long serialVersionUID = 1L;
	
	public TablaConteoPresidente(){
		String[] column ={
				"Nombre","Apellidos","Cantidad de votos presidente"
		};
		this.setColumnIdentifiers(column);
	}
	public TablaConteoPresidente(Candidato[] candidatos){
		String[] column ={
				"Nombre","Apellidos","Cantidad de votos presidente"
		};
		this.setColumnIdentifiers(column);
		for (int i = 0; i < candidatos.length;i++){
			Object[] newRow = new Object[]{
				candidatos[i].getNombre(), candidatos[i].getApellidos(), candidatos[i].getCant_votos_presidente()	
			};
			addRow(newRow);
			}
		}
	@Override
	public boolean isCellEditable (int row, int column)
	{
		return false;
	}

}
