package Test;

import static org.junit.Assert.*;

import javax.xml.namespace.QName;

import logica.Candidato;
import logica.ComisionElectoral;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;

import auxiliar.DatosTemporales;
import interfaz.GestionCandidato;

public class CandidatoTestCase {
	
	private ComisionElectoral ce;
	private GestionCandidato gc;

	@Before
	public void setUp() throws Exception {
		ce = new ComisionElectoral();
		DatosTemporales dt = new DatosTemporales();
		ce.setCandidatosActivos(dt.getCE().getCandidatosActivos());

		gc = new GestionCandidato(ce);

	}

	@After
	public void tearDown() throws Exception {
		ce = null;
	}

	// Datos caja negra:
     //  - ci: "02091978927", "73082712345"
	//  - index: -1, -1
	

	@Test
	public void testCiEncontrado () 
	{
		assertTrue(ce.buscarCI("02091978927", -1));
	}

	@Test
	public void testCiNoEncontrado () 
	{
		assertFalse(ce.buscarCI("73082712345", -1));
	}


	// Datos caja negra:
     //  - nombre: "Adriana", "Adriana", ""
	//  - apellidos: "Porrata", "Porrata", "Porrata"
	//  - ci: "01067845698", "01067845698". "01067845698"
	//  - año: 1, 1, 1
	//  - brigada: 11, 23, 11

	@Test
	public void testDatosValidos () 
	{
		assertTrue(gc.validarDatos("Adriana", "Porrata", "01067845698", 1, 11));
	}

	@Test
	public void testDatosInvalidos () 
	{
		assertFalse(gc.validarDatos("Adriana", "Porrata", "01067845698", 1, 23));
	}

	@Test
	public void testDatosInvalidos2 () 
	{
		assertFalse(gc.validarDatos("", "Porrata", "01067845698", 1, 11));
	}

	
	

}
