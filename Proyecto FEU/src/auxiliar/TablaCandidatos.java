package auxiliar;
import java.util.Vector;

import javax.swing.JTable;
import javax.swing.table.DefaultTableCellRenderer;
import javax.swing.table.DefaultTableModel;
import javax.swing.table.JTableHeader;

import logica.Candidato;

public class TablaCandidatos extends DefaultTableModel {

	public TablaCandidatos(){
		String[] columnNames = {
				"Nombre", "Apellidos", "Año", "Facultad"};
		this.setColumnIdentifiers(columnNames);
		
	}
	
	public TablaCandidatos(Candidato [] candidatos){
		String[] columnNames = {
				"Nombre", "Apellidos", "Año", "Facultad"};
		this.setColumnIdentifiers(columnNames);
		for (int i = 0; i < candidatos.length; i++) {
			Object[] newRow = new Object[]{candidatos[i].getNombre(), candidatos[i].getApellidos(), candidatos[i].getAnno(), candidatos[i].getFacultad()};
			addRow(newRow);
		}
	}
	
	public void adicionar(String Nombre, String Apellido ,int Anno, String Facultad){
		Object[] newRow = new Object[]{Nombre, Apellido, Anno, Facultad};
		addRow(newRow);
	}
	
	public void eliminar(int pos){
		removeRow(pos);
	}

	@SuppressWarnings("unchecked")
	public void modificar(int pos, String Nombre, String Apellido ,int Anno, String Facultad){
		Object[] newRow = new Object[]{Nombre, Apellido, Anno, Facultad};
		setValueAt(Nombre, pos, 0);
		setValueAt(Apellido, pos, 1);
		setValueAt(Anno, pos, 2);
		setValueAt(Facultad, pos, 3);
				
	}
	@Override
	public boolean isCellEditable (int row, int column)
	{
		return false;
	}
}