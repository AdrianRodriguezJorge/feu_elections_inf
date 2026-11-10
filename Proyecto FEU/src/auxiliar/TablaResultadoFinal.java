package auxiliar;
import javax.swing.table.DefaultTableModel;

import logica.Candidato;


public class TablaResultadoFinal extends DefaultTableModel{
	public TablaResultadoFinal(){
		String[] columnNames = {"Nombres y apellidos", "Facultad", "Cargo"};
		this.setColumnIdentifiers(columnNames);
	}
	public TablaResultadoFinal(Candidato [] candidatos){
		String[] columnNames = {"Nombres y apellidos", "Facultad", "Cargo"};
		this.setColumnIdentifiers(columnNames);
		Object[] newRow = new Object[]{candidatos[0].toString(), candidatos[0].getFacultad(), "Presidente"};
		addRow(newRow);
		for (int i = 1; i < candidatos.length - 2; i++) {
			Object[] newRow2 = new Object[]{candidatos[i].toString(), candidatos[i].getFacultad(), "Miembro"};
			addRow(newRow2);
		}
	}
	@Override
	public boolean isCellEditable (int row, int column)
	{
		return false;
	}
}
