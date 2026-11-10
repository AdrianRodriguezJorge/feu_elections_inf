package Test;

import static org.junit.Assert.*;
import interfaz.*;
import logica.*;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;

import auxiliar.DatosTemporales;

public class test {
	
	private Principal principal;
	private ComisionElectoral CE = new DatosTemporales().getCE();
	private InicioSesion login;
	private Boleta_Inter boletaInter;
	
	@Before
	public void setUp() throws Exception {
		principal = new Principal();
		login = new InicioSesion(CE,principal);
		Votante vot = (Votante) CE.getUsuarios().get(0);
		boletaInter = new Boleta_Inter(CE,vot);
		Boleta boleta = new Boleta(102);
		CE.getBoletas().add(boleta);
	}

	@After
	public void tearDown() throws Exception {
	}

	//Pruebas de Caja Negra
	
	//Nombre y clave bien
	@Test
	public void UsuarioYClaveValVotante() {
		String nombre = "Juan", password = "1234";
		boolean votante = false;
		if(login.esVotante(nombre, password)!=null)
			votante = true;
		assertEquals( true,votante);
	}
	
	//Nombre y clave mal
	@Test
	public void UsuarioYClaveInvalVotante() {
		String nombre = "Miguel", password = "";
		boolean votante = false;
		if(login.esVotante(nombre, password)!=null)
			votante = true;
		assertEquals( false,votante);
	}
	
	//Nombre bien clave mal
	@Test
	public void UsuarioValClaveInvalVotante() {
		String nombre = "Juan", password = "0101";
		boolean votante = false;
		if(login.esVotante(nombre, password)!=null)
			votante = true;
		assertEquals( false,votante);
	}
	
	//Nombre mal clave bien
	@Test
	public void UsuarioInvalClaveValVotante() {
		String nombre = "", password = "1234";
		boolean votante = false;
		if(login.esVotante(nombre, password)!=null)
			votante = true;
		assertEquals( false,votante);
	}
	/*Datos caja negra:
	 * nombre- "Juan" , "Migue", "     ".
	 * password- "1234" , "0101", "    ".
	 * */
	
	
	
	

	//Pruebas de Caja Blanca
	
		//Juan, 1234 , lista vac�a
		@Test
		public void pruebaCajaBlanca1() {
			CE = new ComisionElectoral();
			login = new InicioSesion(CE,principal);
			String nombre = "Juan", password = "1234";
			boolean votante = false;
			if(login.esVotante(nombre, password)!=null)
				votante = true;
			assertEquals( false,votante);
		}
		
		//admin, 0000 , lista con datos
		@Test
		public void pruebaCajaBlanca3() {
			String nombre = "admin", password = "0000";
			boolean votante = false;
			if(login.esVotante(nombre, password)!=null)
				votante = true;
			assertEquals( false,votante);
		}
		
		//Bruno, 1234, lista con datos
		@Test
		public void pruebaCajaBlanca4() {
			String nombre = "Bruno", password = "1234";
			boolean votante = false;
			if(login.esVotante(nombre, password)!=null)
				votante = true;
			assertEquals( false,votante);
		}
		
		//Juan, 0101 , lista con datos
		@Test
		public void pruebaCajaBlanca5() {
			String nombre = "Juan", password = "0101";
			boolean votante = false;
			if(login.esVotante(nombre, password)!=null)
				votante = true;
			assertEquals( false,votante);
		}
		
		//Juan, 1234 , lista con datos
		@Test
		public void pruebaCajaBlanca6() {
			String nombre = "Juan", password = "1234";
			boolean votante = false;
			if(login.esVotante(nombre, password)!=null)
				votante = true;
			assertEquals( true,votante);
		}
		
		/*Datos caja blanca:
		 * nombre- "Juan" , "Bruno", "admin ".
		 * password- "1234" , "0101", "0000 ".
		 * Casos lista- vacia, con datos.
		 * 
		 * Caso 2: No implementado porque la variable booleana que interviene siempre comienza en "true" por lo que queda descartado.
		 * */
		
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
		//Pruebas de Caja Negra
		
		//Código disponible
		@Test
		public void codDisponible() {
			int cod = 101;
			boolean result = boletaInter.yaEsta(cod);
			assertEquals( false,result);
		}
		
		//Código no disponible
		@Test
		public void codNoDisponible() {
			int cod = 102;
			boolean result = boletaInter.yaEsta(cod);
			assertEquals( true,result);
		}
		
		/*Datos caja negra:
		 * cod- 101 , 102.
		 * Esto casos son particulares, ya que otro c�digo genera el valor de la variable cod, por lo que no existen casos negativos, extremos u otro tipo de irregularidades.
		 * */
		
		
		//Pruebas de Caja Blanca
		
		//cod  102, lista sin datos
		@Test
		public void cajaBlancaCaso1() {
			CE.getBoletas().clear();
			int cod = 102;
			boolean result = boletaInter.yaEsta(cod);
			assertEquals( false,result);
		}
		
		//cod  101, lista con datos
		@Test
		public void cajaBlancaCaso2() {
			int cod = 101;
			boolean result = boletaInter.yaEsta(cod);
			assertEquals( false,result);
		}
		
		//cod  102, lista con datos
		@Test
		public void cajaBlancaCaso3() {
			int cod = 102;
			boolean result = boletaInter.yaEsta(cod);
			assertEquals( true,result);
		}
		
		/*Datos caja blanca:
		 * cod- 101 , 102 .
		 * Casos lista- vacia, con datos.
		 * */

}
