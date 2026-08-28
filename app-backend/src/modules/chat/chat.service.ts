import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { RecomendacionIa } from '../recomendacion-ia/recomendacion-ia.entity';
import { ChatMessageDto } from './dto/chat-message.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private openai: OpenAI;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(RecomendacionIa)
    private readonly recomRepo: Repository<RecomendacionIa>,
  ) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY no está configurada. El chat de recomendaciones fallará al usarse.');
    }
    this.openai = new OpenAI({ apiKey });
  }

  async chat(messages: ChatMessageDto[]): Promise<string> {
    // Cargar recomendaciones activas de la BD
    const recomendaciones = await this.recomRepo.find({
      where: { activo: true },
      order: { calificacion: 'DESC' },
    });

    // Formatear como contexto para el prompt
    const contexto = recomendaciones
      .map((r, i) => {
        const partes = [`${i + 1}. **${r.titulo}** (${r.categoria})`];
        if (r.descripcion) partes.push(`   Descripción: ${r.descripcion}`);
        if (r.ubicacion)   partes.push(`   Ubicación: ${r.ubicacion}`);
        if (r.distancia_km) partes.push(`   Distancia: ${r.distancia_km} km del hotel`);
        if (r.calificacion) partes.push(`   Calificación: ${r.calificacion}/5`);
        return partes.join('\n');
      })
      .join('\n\n');

    const systemPrompt = `Eres el asistente virtual del Hotel Bombay. Tu rol es ayudar a los huéspedes a descubrir lugares, actividades y experiencias durante su estadía.

Solo puedes recomendar lugares que están en la siguiente lista oficial del hotel. No inventes lugares ni información fuera de esta lista.

LISTA DE RECOMENDACIONES DISPONIBLES:
${contexto || 'No hay recomendaciones disponibles en este momento.'}

INSTRUCCIONES:
- Responde siempre en español, de forma amigable y cálida.
- Si el huésped pregunta por un tipo de lugar (ej. "restaurantes", "lugares turísticos"), filtra y recomienda los relevantes de la lista.
- Incluye detalles útiles: ubicación, distancia, calificación cuando los tengas.
- Si no hay recomendaciones que coincidan con lo que pide, dilo con amabilidad y sugiere lo más cercano disponible.
- Mantén las respuestas concisas (máximo 3-4 recomendaciones a la vez salvo que pidan más).
- Puedes hacer preguntas para entender mejor qué busca el huésped (¿prefiere algo cerca? ¿tiene presupuesto? ¿va con familia?).
- No respondas preguntas fuera del ámbito de recomendaciones turísticas y del hotel.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        max_tokens: 800,
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content ?? 'Lo siento, no pude generar una respuesta.';
    } catch (error: any) {
      // Log del error real de OpenAI (status, código, mensaje) para poder diagnosticar
      // sin exponer detalles internos al cliente.
      const status = error?.status ?? error?.response?.status;
      const code = error?.code ?? error?.error?.code;
      const message = error?.error?.message ?? error?.message;
      this.logger.error(`Fallo al llamar a OpenAI (status=${status}, code=${code}): ${message}`, error?.stack);
      throw new InternalServerErrorException('Error al comunicarse con el asistente de IA.');
    }
  }
}
