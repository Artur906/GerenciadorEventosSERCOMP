import { prisma } from "../lib/prisma";
import { createPayment } from "../services/payments/createPayment";
import { findActivityById } from "./activityRepository";
import {
  checkIfActivityHasVacancy,
  createUserAtividade,
  findAllSubscribersInActivity
} from "./userAtividadeRepository";
import { createUser } from "./userRepository";

export async function findAllEvents() {
  const response = await prisma.evento.findMany();

  return response;
}

export async function getEventoPrecoById(uuid_evento: string) {
  const evento = await prisma.evento.findUniqueOrThrow({
    where: {
      uuid_evento,
    },
    select: {
      lote: {
        select: {
          preco: true,
        },
      },
    },
  });

  return evento.lote;
}

export interface RegisterParticipanteParams {
  nome: string;
  nome_cracha: string;
  email: string;
  instituicao: string;
  atividades?: {
    minicurso_id?: string;
    workshop_id?: string;
    oficina_id?: string;
  };
  lote_id: string;
}

export async function registerParticipante({
  nome,
  nome_cracha,
  email,
  instituicao,
  atividades,
  lote_id,
}: RegisterParticipanteParams) {
  let user;
  try {
    user = await createUser({
      nome,
      nome_cracha,
      email,
      instituicao,
    });

    if (await isUserRegisteredInEventFromLote(user.uuid_user, lote_id)) {
      throw new Error("Você já se cadastrou nesse evento!");
    }

    const activities_ids = [
      atividades?.minicurso_id,
      atividades?.workshop_id,
      atividades?.oficina_id,
    ];

    for (const uuid_atividade of activities_ids) {
      if (uuid_atividade) {
        await checkIfActivityHasVacancy(uuid_atividade, user.uuid_user);
        await createUserAtividade(user.uuid_user, uuid_atividade);
      }
    }

    return await createPayment(user.uuid_user, lote_id);
  } catch (error) {
    // Se ocorrer um erro, exclua o usuário
    if (user) {
      await prisma.usuario.delete({
        where: {
          uuid_user: user.uuid_user,
        },
      });
    }
    throw error; // Rejeite a promessa com o erro original
  }
}

export async function isUserRegisteredInEventFromLote(
  user_id: string,
  lote_id: string
): Promise<boolean> {
  const lote = await prisma.lote.findUniqueOrThrow({
    where: {
      uuid_lote: lote_id,
    },
    select: {
      uuid_evento: true,
    },
  });

  if (!lote) {
    throw new Error(`Lote com ID ${lote_id} não encontrado.`);
  }

  const event_id = lote.uuid_evento;

  const registrationCount = await prisma.userInscricao.count({
    where: {
      uuid_user: user_id,
      lote: {
        uuid_evento: event_id,
      },
    },
  });

  return registrationCount > 0;
}

export async function findAllActivitiesInEvent(uuid_evento: string) {
  const activities = await prisma.evento.findFirst({
    where: {
      uuid_evento,
    },
    select: {
      atividade: {
        select: {
          uuid_atividade: true,
          nome: true,
          max_participants: true,
          tipo_atividade: true,
          _count: {
            select: {
              userAtividade: true,
            },
          },
        },
        orderBy: {
          nome: "asc",
        },
      },
    },
  });

  return activities;
}
