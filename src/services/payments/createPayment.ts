import { payment } from "../../lib/mercado_pago";
import { findUserById } from "../../repositories/userRepository";
import { findLoteById } from "../../repositories/loteRepository";
import { createUserInscricao } from "../../repositories/userInscricaoRepository";
import { addDays, format } from "date-fns";

export async function createPayment(user_id: string, lote_id: string) {
    const user = await findUserById(user_id);

    const lote = await findLoteById(lote_id);

    const requestOptions = {
      idempotencyKey: `${user_id}-${lote_id}`,
    };

    const API_URL = process.env.API_URL || "";

    const current_date = new Date();

    const date_of_expiration = addDays(current_date, 10)
 
    const body = {
      transaction_amount: lote.preco,
      description: "Compra de ingresso",
      payment_method_id: "pix",
      date_of_expiration: format(date_of_expiration, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
      notification_url: `${API_URL}/lote/${lote_id}/user/${user_id}/realizar-pagamento`,
      payer: {
        email: user.email,
      },
    };

    // Criar pagamento
    const response = await payment.create({
      body,
      requestOptions,
    });

    if (!response) {
      throw new Error("Ocorreu um erro interno no servidor");
    }

    const userInscricao = createUserInscricao(user_id, lote_id, response.id!.toString(), response.date_of_expiration!.toString());

    return userInscricao;
}

