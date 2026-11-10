package auxiliar;

import java.util.ArrayList;

import javax.swing.AbstractListModel;

import logica.Candidato;

public class Model_Candidato extends AbstractListModel
{
    private ArrayList <Candidato> lstCandidatos = new ArrayList<Candidato>();

    // establece la lista de candidatos al modelo
	public void setlstCandidatos(ArrayList<Candidato> lstCandidatos) {
		this.lstCandidatos = lstCandidatos;
		this.fireIntervalAdded(this, 0, getSize());
	}
    
	// devuelve el tamaño de la lista del modelo
	public int getSize() {
		return lstCandidatos.size();
	}

	// devuelve el elemento de la posición indice dentro del modelo
	public Object getElementAt(int indice) {
        Candidato x = null;
		if (indice > -1 && indice < this.getSize())
			x = lstCandidatos.get(indice);
		return x;
	}

	// agrega un candidato al final de la lista del modelo
	public void addCandidato(Candidato p) {
		lstCandidatos.add(p);
		this.fireIntervalAdded(this, getSize(), getSize());
	}

	// devuelve el candidato en la posición del indice dado en el modelo
	public Candidato getCandidatoAt(int indice) {
		Candidato x = null;
		if (indice > -1 && indice < this.getSize())
			x = lstCandidatos.get(indice);
		return x;
	}

	// elimina un candidato del modelo que ocupa la posición indice
	public void removeCandidato (int indice) {
		if (indice > -1 && indice < this.getSize()) {
			lstCandidatos.remove(indice);
			this.fireIntervalRemoved(this, indice, indice);
		}
	}
	// modifica en el modelo los valores del candidato en la posición dada
	public void updateCandidato (int indice, Candidato c) {
		if (indice > -1 && indice < this.getSize()) {
			lstCandidatos.set(indice, c);
			this.fireContentsChanged(this, indice, indice);
		}
	}
}
